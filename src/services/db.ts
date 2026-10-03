import { Category, EncryptedPayload, Expense, RecurringExpense, VaultMetadata } from '../types';
import {
  base64ToBuffer,
  bufferToBase64,
  calculateChecksum,
  decryptData,
  deriveKeyFromPassphrase,
  encryptData,
  generateDeviceKey,
  getRandomBytes,
} from './crypto';
import { DEFAULT_CATEGORIES } from './defaultCategories';

const DB_NAME = 'ExpenseVaultDB';
const DB_VERSION = 1;
const STORE_ENCRYPTED = 'encrypted_store';
const STORE_KEYS = 'secure_keys';

export interface VaultData {
  expenses: Expense[];
  categories: Category[];
  recurringExpenses?: RecurringExpense[];
  metadata: VaultMetadata;
}

// Open IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ENCRYPTED)) {
        db.createObjectStore(STORE_ENCRYPTED, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS, { keyPath: 'id' });
      }
    };
  });
}

// Read record from object store
async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Write record to object store
async function idbPut(storeName: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export class EncryptedDatabaseService {
  private activeKey: CryptoKey | null = null;
  private isUnlocked: boolean = false;
  private currentSalt: Uint8Array | null = null;
  private cachedData: VaultData | null = null;

  // Initialize DB and determine if unlocked or requires passcode
  async initialize(): Promise<{ isLocked: boolean; hasPasscode: boolean; metadata: VaultMetadata }> {
    const metadataRecord = await idbGet<{ key: string; metadata: VaultMetadata }>(
      STORE_ENCRYPTED,
      'vault_metadata'
    );

    let metadata: VaultMetadata = metadataRecord?.metadata || {
      vaultId: 'vault_' + Math.random().toString(36).substring(2, 9),
      hasPasscode: false,
      currency: 'INR',
      currencySymbol: '₹',
      autoLockMinutes: 15,
      cloudSyncEnabled: false,
    };

    // Auto-migrate previous USD default to INR if applicable
    if (metadata.currency === 'USD' || metadata.currencySymbol === '$') {
      metadata.currency = 'INR';
      metadata.currencySymbol = '₹';
      await idbPut(STORE_ENCRYPTED, { key: 'vault_metadata', metadata });
    }

    if (!metadataRecord) {
      await idbPut(STORE_ENCRYPTED, { key: 'vault_metadata', metadata });
    }

    // Check if device key exists
    const deviceKeyRecord = await idbGet<{ id: string; rawKey: ArrayBuffer; salt: string }>(
      STORE_KEYS,
      'device_key'
    );

    if (metadata.hasPasscode) {
      // User enabled a custom PIN/passphrase - app starts locked
      this.isUnlocked = false;
      this.activeKey = null;
      return { isLocked: true, hasPasscode: true, metadata };
    }

    // No manual passcode; use or generate device key
    if (deviceKeyRecord) {
      this.activeKey = await window.crypto.subtle.importKey(
        'raw',
        deviceKeyRecord.rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      this.currentSalt = base64ToBuffer(deviceKeyRecord.salt);
    } else {
      // First boot: generate fresh AES-256-GCM key
      this.activeKey = await generateDeviceKey();
      const rawKey = await window.crypto.subtle.exportKey('raw', this.activeKey);
      this.currentSalt = getRandomBytes(16);
      await idbPut(STORE_KEYS, {
        id: 'device_key',
        rawKey,
        salt: bufferToBase64(this.currentSalt),
      });
    }

    this.isUnlocked = true;
    await this.loadOrSeedVault(metadata);

    // Automatically evaluate and process recurring monthly expenses on startup
    try {
      await this.processRecurringExpenses();
    } catch (e) {
      console.warn('Auto recurring processing deferred:', e);
    }

    return { isLocked: false, hasPasscode: false, metadata: this.cachedData?.metadata || metadata };
  }

  // Load encrypted data from IDB or seed with starter samples
  private async loadOrSeedVault(metadata: VaultMetadata): Promise<VaultData> {
    if (!this.activeKey) throw new Error('Database is locked');

    const encryptedPayloadRecord = await idbGet<{ key: string; payload: EncryptedPayload }>(
      STORE_ENCRYPTED,
      'vault_data'
    );

    if (encryptedPayloadRecord) {
      try {
        const decrypted = await decryptData<VaultData>(encryptedPayloadRecord.payload, this.activeKey);
        // Ensure recurringExpenses array is present
        if (!decrypted.recurringExpenses) {
          decrypted.recurringExpenses = this.generateSampleRecurringExpenses();
        }
        // Ensure metadata is INR
        if (decrypted.metadata) {
          decrypted.metadata.currency = 'INR';
          decrypted.metadata.currencySymbol = '₹';
        }
        this.cachedData = decrypted;
        await this.saveVaultData(decrypted);
        return decrypted;
      } catch (err) {
        console.error('Decryption failed, checking fallback', err);
        throw new Error('Failed to decrypt vault data: invalid key or corrupted database.');
      }
    }

    // First-time seed with realistic initial expenses and recurring costs for Indian Rupee context
    const seedExpenses = this.generateSampleExpenses();
    const seedRecurring = this.generateSampleRecurringExpenses();
    const initialData: VaultData = {
      expenses: seedExpenses,
      categories: DEFAULT_CATEGORIES,
      recurringExpenses: seedRecurring,
      metadata: {
        ...metadata,
        currency: 'INR',
        currencySymbol: '₹',
      },
    };

    await this.saveVaultData(initialData);
    this.cachedData = initialData;
    return initialData;
  }

  // Generate realistic sample expenses across the current year in INR
  private generateSampleExpenses(): Expense[] {
    const today = new Date();
    const year = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1; // 1-12
    const currentMonthStr = String(currentMonthNum).padStart(2, '0');

    const expensesList: Expense[] = [];
    let counter = 1;

    // Seed previous months of the current year for historical trend visualization
    for (let m = 1; m < currentMonthNum; m++) {
      const mStr = String(m).padStart(2, '0');
      const monthlyPacks = [
        { day: 1, amount: 18000, categoryId: 'cat_housing', note: 'Apartment House Rent', method: 'bank_transfer' as const, tags: ['recurring'] },
        { day: 5, amount: 999, categoryId: 'cat_subscriptions', note: 'Broadband Fiber Internet', method: 'credit_card' as const, tags: ['recurring'] },
        { day: 8, amount: 4500 + ((m * 370) % 2500), categoryId: 'cat_groceries', note: 'Monthly Groceries & Staples', method: 'mobile_pay' as const },
        { day: 12, amount: 2800 + ((m * 230) % 1800), categoryId: 'cat_food', note: 'Family Dining & Lunches', method: 'mobile_pay' as const },
        { day: 16, amount: 1900 + ((m * 410) % 1500), categoryId: 'cat_transport', note: 'Fuel & Metro Transit', method: 'mobile_pay' as const },
        { day: 22, amount: 1200 + ((m * 180) % 2200), categoryId: 'cat_shopping', note: 'Apparel & Home Supplies', method: 'credit_card' as const },
        { day: 26, amount: 850 + ((m * 150) % 900), categoryId: 'cat_entertainment', note: 'Cinema & Streaming', method: 'debit_card' as const },
      ];

      monthlyPacks.forEach((item) => {
        const dStr = String(item.day).padStart(2, '0');
        const pastTimestamp = new Date(year, m - 1, item.day, 12, 0).getTime();
        expensesList.push({
          id: `exp_hist_${counter++}_${year}_${mStr}`,
          amount: item.amount,
          categoryId: item.categoryId,
          date: `${year}-${mStr}-${dStr}`,
          time: '12:30',
          note: item.note,
          paymentMethod: item.method,
          tags: item.tags || [],
          createdAt: pastTimestamp,
          updatedAt: pastTimestamp,
        });
      });
    }

    // Current month items
    const currentMonthItems = [
      { day: 1, amount: 18000, categoryId: 'cat_housing', note: 'Apartment Rent (Recurring Fixed Cost)', method: 'bank_transfer' as const, tags: ['recurring'] },
      { day: 2, amount: 2450, categoryId: 'cat_groceries', note: 'Weekly Grocery & Veggies', method: 'mobile_pay' as const },
      { day: 3, amount: 350, categoryId: 'cat_food', note: 'Chai & Snacks with Colleagues', method: 'mobile_pay' as const },
      { day: 4, amount: 650, categoryId: 'cat_transport', note: 'Metro & Cab Commute', method: 'mobile_pay' as const },
      { day: 5, amount: 999, categoryId: 'cat_subscriptions', note: 'Broadband Fiber Internet (Recurring Fixed Cost)', method: 'credit_card' as const, tags: ['recurring'] },
      { day: 6, amount: 1200, categoryId: 'cat_entertainment', note: 'Weekend Movie & Popcorn', method: 'debit_card' as const },
      { day: 7, amount: 1850, categoryId: 'cat_groceries', note: 'Organic Market & Dairy', method: 'mobile_pay' as const },
      { day: today.getDate() > 1 ? today.getDate() - 1 : 1, amount: 540, categoryId: 'cat_food', note: 'Family Dinner Takeout', method: 'mobile_pay' as const },
    ];

    currentMonthItems.forEach((item, index) => {
      const dayStr = String(Math.min(item.day, today.getDate())).padStart(2, '0');
      expensesList.push({
        id: `exp_cur_${counter++}_${Date.now()}`,
        amount: item.amount,
        categoryId: item.categoryId,
        date: `${year}-${currentMonthStr}-${dayStr}`,
        time: '12:30',
        note: item.note,
        paymentMethod: item.method,
        tags: item.tags || [],
        createdAt: Date.now() - (index * 86400000),
        updatedAt: Date.now() - (index * 86400000),
      });
    });

    return expensesList;
  }

  // Generate realistic sample recurring monthly expenses in INR
  private generateSampleRecurringExpenses(): RecurringExpense[] {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    return [
      {
        id: 'rec_rent_1',
        name: 'Apartment House Rent',
        amount: 18000,
        categoryId: 'cat_housing',
        dayOfMonth: 1,
        paymentMethod: 'bank_transfer',
        isActive: true,
        lastAppliedMonth: currentMonthKey, // already seeded above for current month
        createdAt: Date.now() - 30 * 86400000,
        updatedAt: Date.now() - 30 * 86400000,
      },
      {
        id: 'rec_fiber_2',
        name: 'High-Speed Broadband Fiber',
        amount: 999,
        categoryId: 'cat_subscriptions',
        dayOfMonth: 5,
        paymentMethod: 'credit_card',
        isActive: true,
        lastAppliedMonth: currentMonthKey, // already seeded above
        createdAt: Date.now() - 25 * 86400000,
        updatedAt: Date.now() - 25 * 86400000,
      },
      {
        id: 'rec_stream_3',
        name: 'OTT Video & Music Subscription',
        amount: 499,
        categoryId: 'cat_subscriptions',
        dayOfMonth: 10,
        paymentMethod: 'mobile_pay',
        isActive: true,
        lastAppliedMonth: undefined, // pending to demonstrate auto-add
        createdAt: Date.now() - 20 * 86400000,
        updatedAt: Date.now() - 20 * 86400000,
      },
      {
        id: 'rec_milk_4',
        name: 'Milk & Daily Grocery Subscription',
        amount: 2500,
        categoryId: 'cat_groceries',
        dayOfMonth: 1,
        paymentMethod: 'mobile_pay',
        isActive: true,
        lastAppliedMonth: undefined,
        createdAt: Date.now() - 15 * 86400000,
        updatedAt: Date.now() - 15 * 86400000,
      },
    ];
  }

  // Save decrypted state into AES-256-GCM encrypted envelope
  async saveVaultData(data: VaultData): Promise<void> {
    if (!this.activeKey) throw new Error('Database is locked');
    this.cachedData = data;

    const payload = await encryptData(data, this.activeKey, this.currentSalt || undefined);
    await idbPut(STORE_ENCRYPTED, { key: 'vault_data', payload });
    await idbPut(STORE_ENCRYPTED, { key: 'vault_metadata', metadata: data.metadata });
  }

  // Unlock with Passcode / PIN
  async unlockWithPasscode(passphrase: string): Promise<VaultData> {
    const saltRecord = await idbGet<{ id: string; salt: string }>(STORE_KEYS, 'passcode_salt');
    if (!saltRecord) throw new Error('No passcode salt configured');

    const salt = base64ToBuffer(saltRecord.salt);
    const key = await deriveKeyFromPassphrase(passphrase, salt);

    const encryptedPayloadRecord = await idbGet<{ key: string; payload: EncryptedPayload }>(
      STORE_ENCRYPTED,
      'vault_data'
    );

    if (!encryptedPayloadRecord) {
      throw new Error('No vault data found in secure storage');
    }

    try {
      const decrypted = await decryptData<VaultData>(encryptedPayloadRecord.payload, key);
      if (!decrypted.recurringExpenses) {
        decrypted.recurringExpenses = this.generateSampleRecurringExpenses();
      }
      if (decrypted.metadata) {
        decrypted.metadata.currency = 'INR';
        decrypted.metadata.currencySymbol = '₹';
      }
      this.activeKey = key;
      this.currentSalt = salt;
      this.isUnlocked = true;
      this.cachedData = decrypted;

      // Auto-process any pending recurring expenses upon successful unlock
      await this.processRecurringExpenses();
      return this.cachedData;
    } catch {
      throw new Error('Incorrect passcode. Unable to decrypt local database.');
    }
  }

  // Set or update master passcode
  async setMasterPasscode(newPassphrase: string | null): Promise<void> {
    if (!this.cachedData) throw new Error('Vault must be loaded to modify security');

    if (!newPassphrase) {
      // Remove passcode - revert to secure device key
      const newDeviceKey = await generateDeviceKey();
      const rawKey = await window.crypto.subtle.exportKey('raw', newDeviceKey);
      const salt = getRandomBytes(16);

      this.activeKey = newDeviceKey;
      this.currentSalt = salt;
      this.cachedData.metadata.hasPasscode = false;

      await idbPut(STORE_KEYS, {
        id: 'device_key',
        rawKey,
        salt: bufferToBase64(salt),
      });

      await this.saveVaultData(this.cachedData);
      return;
    }

    // Set new master passcode with PBKDF2
    const salt = getRandomBytes(16);
    const derivedKey = await deriveKeyFromPassphrase(newPassphrase, salt);

    this.activeKey = derivedKey;
    this.currentSalt = salt;
    this.cachedData.metadata.hasPasscode = true;

    // Save salt
    await idbPut(STORE_KEYS, {
      id: 'passcode_salt',
      salt: bufferToBase64(salt),
    });

    // Encrypt and persist with new key
    await this.saveVaultData(this.cachedData);
  }

  // Lock vault manually or on timeout
  lockVault(): void {
    this.activeKey = null;
    this.isUnlocked = false;
    this.cachedData = null;
  }

  // Get current unlocked vault data
  getData(): VaultData {
    if (!this.isUnlocked || !this.cachedData) {
      throw new Error('Vault is locked. Decrypt first to access expenses.');
    }
    if (!this.cachedData.recurringExpenses) {
      this.cachedData.recurringExpenses = [];
    }
    return this.cachedData;
  }

  // Add an expense
  async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const data = this.getData();
    const newExpense: Expense = {
      ...expense,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    data.expenses = [newExpense, ...data.expenses];
    await this.saveVaultData(data);
    return newExpense;
  }

  // Update an expense
  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const data = this.getData();
    const index = data.expenses.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Expense not found');

    const updated: Expense = {
      ...data.expenses[index],
      ...updates,
      updatedAt: Date.now(),
    };
    data.expenses[index] = updated;
    await this.saveVaultData(data);
    return updated;
  }

  // Delete an expense
  async deleteExpense(id: string): Promise<void> {
    const data = this.getData();
    data.expenses = data.expenses.filter((e) => e.id !== id);
    await this.saveVaultData(data);
  }

  // Delete multiple expenses
  async deleteMultipleExpenses(ids: string[]): Promise<void> {
    const data = this.getData();
    const idSet = new Set(ids);
    data.expenses = data.expenses.filter((e) => !idSet.has(e.id));
    await this.saveVaultData(data);
  }

  // ----------------------------------------------------
  // RECURRING EXPENSES METHODS
  // ----------------------------------------------------

  // Get all recurring expenses
  getRecurringExpenses(): RecurringExpense[] {
    const data = this.getData();
    return data.recurringExpenses || [];
  }

  // Add a recurring expense
  async addRecurringExpense(
    item: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RecurringExpense> {
    const data = this.getData();
    if (!data.recurringExpenses) data.recurringExpenses = [];

    const newRecurring: RecurringExpense = {
      ...item,
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    data.recurringExpenses.push(newRecurring);
    await this.saveVaultData(data);

    // Immediately trigger auto-process to see if it should apply to the current month
    await this.processRecurringExpenses();
    return newRecurring;
  }

  // Update a recurring expense
  async updateRecurringExpense(
    id: string,
    updates: Partial<RecurringExpense>
  ): Promise<RecurringExpense> {
    const data = this.getData();
    if (!data.recurringExpenses) data.recurringExpenses = [];
    const index = data.recurringExpenses.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Recurring expense not found');

    const updated: RecurringExpense = {
      ...data.recurringExpenses[index],
      ...updates,
      updatedAt: Date.now(),
    };

    data.recurringExpenses[index] = updated;
    await this.saveVaultData(data);
    return updated;
  }

  // Delete a recurring expense
  async deleteRecurringExpense(id: string): Promise<void> {
    const data = this.getData();
    if (!data.recurringExpenses) return;
    data.recurringExpenses = data.recurringExpenses.filter((r) => r.id !== id);
    await this.saveVaultData(data);
  }

  /**
   * Process and automatically add recurring expenses to the expense log each month.
   * Checks if an expense has already been applied for the target month (e.g. '2026-09').
   * If not, automatically creates the expense record and marks the recurring item as applied.
   */
  async processRecurringExpenses(targetMonth?: string): Promise<{ addedCount: number; addedExpenses: Expense[] }> {
    const data = this.getData();
    if (!data.recurringExpenses || data.recurringExpenses.length === 0) {
      return { addedCount: 0, addedExpenses: [] };
    }

    const today = new Date();
    const currentMonthKey = targetMonth || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = currentMonthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const addedExpenses: Expense[] = [];

    data.recurringExpenses.forEach((rec) => {
      if (!rec.isActive) return;

      // Check if already applied for this month by record property
      if (rec.lastAppliedMonth === currentMonthKey) {
        return;
      }

      // Also check if an expense already exists with this recurring tag and month
      const existingTx = data.expenses.find(
        (e) => e.date.startsWith(currentMonthKey) && e.tags?.includes(`recurring_${rec.id}`)
      );

      if (existingTx) {
        rec.lastAppliedMonth = currentMonthKey;
        return;
      }

      // Add expense record
      const clampedDay = Math.min(Math.max(1, rec.dayOfMonth), daysInMonth);
      const dayStr = String(clampedDay).padStart(2, '0');
      const dateStr = `${currentMonthKey}-${dayStr}`;

      const newExpense: Expense = {
        id: `exp_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        amount: rec.amount,
        categoryId: rec.categoryId,
        date: dateStr,
        time: '09:00',
        note: `${rec.name} (Recurring Fixed Cost)`,
        paymentMethod: rec.paymentMethod,
        tags: ['recurring', `recurring_${rec.id}`],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      data.expenses = [newExpense, ...data.expenses];
      rec.lastAppliedMonth = currentMonthKey;
      rec.updatedAt = Date.now();
      addedExpenses.push(newExpense);
    });

    if (addedExpenses.length > 0) {
      await this.saveVaultData(data);
    }

    return { addedCount: addedExpenses.length, addedExpenses };
  }

  // Update Category budget or details
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const data = this.getData();
    const index = data.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Category not found');

    data.categories[index] = {
      ...data.categories[index],
      ...updates,
    };
    await this.saveVaultData(data);
    return data.categories[index];
  }

  // Add custom Category
  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const data = this.getData();
    const newCat: Category = {
      ...category,
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    };
    data.categories.push(newCat);
    await this.saveVaultData(data);
    return newCat;
  }

  // Update vault metadata / settings (currency, etc.)
  async updateMetadata(updates: Partial<VaultMetadata>): Promise<VaultMetadata> {
    const data = this.getData();
    data.metadata = {
      ...data.metadata,
      ...updates,
    };
    await this.saveVaultData(data);
    return data.metadata;
  }

  // Export encrypted database file (.encdb / .vault)
  async exportEncryptedDatabaseFile(passphrase?: string): Promise<{ blob: Blob; filename: string }> {
    const data = this.getData();
    let exportPayload: EncryptedPayload;

    if (passphrase) {
      // Encrypt with dedicated export passphrase
      const salt = getRandomBytes(16);
      const exportKey = await deriveKeyFromPassphrase(passphrase, salt);
      exportPayload = await encryptData(data, exportKey, salt);
    } else if (this.activeKey) {
      // Encrypt with active vault key
      exportPayload = await encryptData(data, this.activeKey, this.currentSalt || undefined);
    } else {
      throw new Error('Cannot export: vault is locked');
    }

    const exportWrapper = {
      app: 'OfflineExpenseTracker',
      fileFormat: 'ENCDB_V1',
      createdAt: new Date().toISOString(),
      payload: exportPayload,
      checksum: await calculateChecksum(JSON.stringify(exportPayload)),
    };

    const jsonStr = JSON.stringify(exportWrapper, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `expense-vault-backup-${dateStr}.encdb`;

    return { blob, filename };
  }

  // Import and restore encrypted database file
  async importEncryptedDatabaseFile(fileContent: string, passphrase?: string): Promise<VaultData> {
    const parsed = JSON.parse(fileContent);
    if (!parsed.payload || parsed.app !== 'OfflineExpenseTracker') {
      throw new Error('Invalid encrypted database file format.');
    }

    const payload: EncryptedPayload = parsed.payload;
    let keyToUse: CryptoKey;

    if (passphrase) {
      const salt = base64ToBuffer(payload.salt);
      keyToUse = await deriveKeyFromPassphrase(passphrase, salt);
    } else if (this.activeKey) {
      keyToUse = this.activeKey;
    } else {
      throw new Error('Passphrase required to decrypt this database file.');
    }

    try {
      const restoredData = await decryptData<VaultData>(payload, keyToUse);
      if (!restoredData.expenses || !restoredData.categories) {
        throw new Error('Malformed database contents.');
      }
      if (!restoredData.recurringExpenses) {
        restoredData.recurringExpenses = [];
      }
      if (restoredData.metadata) {
        restoredData.metadata.currency = 'INR';
        restoredData.metadata.currencySymbol = '₹';
      }

      this.cachedData = restoredData;
      this.activeKey = keyToUse;
      this.isUnlocked = true;
      await this.saveVaultData(restoredData);
      return restoredData;
    } catch {
      throw new Error('Failed to decrypt database file. Incorrect passphrase.');
    }
  }

  // Reset or clear database
  async clearAllData(): Promise<void> {
    const data = this.getData();
    data.expenses = [];
    data.categories = DEFAULT_CATEGORIES;
    data.recurringExpenses = [];
    await this.saveVaultData(data);
  }
}

export const dbService = new EncryptedDatabaseService();
