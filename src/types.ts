export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'mobile_pay' | 'bank_transfer' | 'other';

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind hex or class color
  budgetLimit: number; // Monthly budget limit in base currency (0 = none)
  isDefault?: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // ISO date string YYYY-MM-DD
  time?: string; // HH:mm
  note: string;
  paymentMethod: PaymentMethod;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RecurringExpense {
  id: string;
  name: string; // e.g. "Apartment Rent", "Netflix Subscription", "Broadband Internet"
  amount: number; // in INR
  categoryId: string;
  dayOfMonth: number; // 1 to 31 (day of the month the expense recurs)
  paymentMethod: PaymentMethod;
  isActive: boolean; // whether active or paused
  lastAppliedMonth?: string; // e.g. "2026-09" to ensure no duplicates in the same month
  createdAt: number;
  updatedAt: number;
}

export interface MonthBudgetSummary {
  monthKey: string; // YYYY-MM
  totalSpent: number;
  totalBudget: number;
  remainingBudget: number;
  percentageUsed: number;
  projectedSpend: number;
  daysRemainingInMonth: number;
  dayAverageSpend: number;
  recurringCommitment: number;
  categorySpending: {
    category: Category;
    spent: number;
    budget: number;
    percentage: number;
    isOverBudget: boolean;
  }[];
}

export interface EncryptedPayload {
  version: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
  tag?: string; // base64
  timestamp: number;
  checksum?: string;
}

export interface VaultMetadata {
  vaultId: string;
  hasPasscode: boolean;
  passcodeHint?: string;
  currency: string;
  currencySymbol: string;
  autoLockMinutes: number;
  lastBackupAt?: number;
  cloudSyncEnabled: boolean;
  cloudSyncUrl?: string;
  cloudSyncProvider?: 'google_drive' | 'email_backup' | 'webdav' | 'custom_endpoint' | 'manual_cloud';
  lastCloudSyncAt?: number;
}

export interface CloudSyncState {
  enabled: boolean;
  provider: 'google_drive' | 'email_backup' | 'webdav' | 'custom_endpoint' | 'manual_cloud';
  endpointUrl: string;
  authToken?: string;
  googleAccountEmail?: string;
  googleAccountName?: string;
  googleAccountPhoto?: string;
  googleDriveFileId?: string;
  backupEmail?: string;
  autoSyncOnSave?: boolean;
  lastSyncTime?: number;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
