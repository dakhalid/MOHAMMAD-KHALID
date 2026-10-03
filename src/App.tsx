import React, { useState, useEffect, useCallback } from 'react';
import { dbService } from './services/db';
import { cloudSyncService } from './services/cloudSync';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Category, CloudSyncState, Expense, RecurringExpense, VaultMetadata } from './types';
import { Header } from './components/Header';
import { HomeScreenWidget } from './components/HomeScreenWidget';
import { MonthlyInsights } from './components/MonthlyInsights';
import { ExpenseList } from './components/ExpenseList';
import { QuickAddModal } from './components/QuickAddModal';
import { WidgetGuideModal } from './components/WidgetGuideModal';
import { BudgetManagerModal } from './components/BudgetManagerModal';
import { VaultSecurityModal } from './components/VaultSecurityModal';
import { CloudBackupModal } from './components/CloudBackupModal';
import { RecurringExpensesModal } from './components/RecurringExpensesModal';
import { YearlySpendingTrend } from './components/YearlySpendingTrend';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PasscodeUnlockScreen } from './components/PasscodeUnlockScreen';
import { EditExpenseModal } from './components/EditExpenseModal';
import { Shield, Plus } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // App initialization state
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Vault data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [metadata, setMetadata] = useState<VaultMetadata>({
    vaultId: 'vault_default',
    hasPasscode: false,
    currency: 'INR',
    currencySymbol: '₹',
    autoLockMinutes: 15,
    cloudSyncEnabled: false,
  });

  // Cloud Sync state
  const [cloudSync, setCloudSync] = useState<CloudSyncState>(() => cloudSyncService.getConfig());

  // Date selection (default current year-month YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Category filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | undefined>(undefined);

  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultCategory, setQuickAddDefaultCategory] = useState<string | undefined>(undefined);
  const [isWidgetGuideOpen, setIsWidgetGuideOpen] = useState(false);
  const [isBudgetManagerOpen, setIsBudgetManagerOpen] = useState(false);
  const [isVaultSettingsOpen, setIsVaultSettingsOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isStandaloneWidgetMode, setIsStandaloneWidgetMode] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load vault data into state
  const refreshVaultData = useCallback(async () => {
    try {
      const data = dbService.getData();
      setExpenses([...data.expenses]);
      setCategories([...data.categories]);
      setRecurringExpenses([...(data.recurringExpenses || [])]);
      setMetadata({ ...data.metadata });
      setCloudSync(cloudSyncService.getConfig());
    } catch (e) {
      console.warn('Could not read decrypted data', e);
    }
  }, []);

  // Initialize DB on boot
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        setIsLoading(true);
        const res = await dbService.initialize();
        if (!isMounted) return;

        setHasPasscode(res.hasPasscode);
        setMetadata(res.metadata);

        if (res.isLocked) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
          await refreshVaultData();
        }

        // Check URL parameters for widget or quick add action
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'quick-add') {
          setIsQuickAddOpen(true);
        }
        if (urlParams.get('mode') === 'widget') {
          setIsStandaloneWidgetMode(true);
        }
        if (urlParams.get('action') === 'recurring') {
          setIsRecurringOpen(true);
        }
      } catch (err: unknown) {
        console.error('Database initialization failed', err);
        if (isMounted) {
          setInitError(err instanceof Error ? err.message : 'Database error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [refreshVaultData]);

  // Handle Passcode Unlock
  const handleUnlock = async (passcode: string) => {
    await dbService.unlockWithPasscode(passcode);
    setIsLocked(false);
    await refreshVaultData();
  };

  // Lock Vault
  const handleLockVault = () => {
    dbService.lockVault();
    setIsLocked(true);
    setExpenses([]);
    setRecurringExpenses([]);
  };

  // Add Expense
  const handleAddExpense = async (newExpense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    await dbService.addExpense(newExpense);
    await refreshVaultData();

    // Auto-sync to cloud if enabled
    if (cloudSync.enabled) {
      cloudSyncService.syncNow().then(() => {
        setCloudSync(cloudSyncService.getConfig());
      }).catch(console.error);
    }
  };

  // Quick 1-tap add from widget
  const handleWidgetQuickAdd = async (amount: number, categoryId: string, note: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    await handleAddExpense({
      amount,
      categoryId,
      date: todayStr,
      time: new Date().toTimeString().slice(0, 5),
      note,
      paymentMethod: 'mobile_pay',
    });
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    await dbService.deleteExpense(id);
    await refreshVaultData();

    if (cloudSync.enabled) {
      cloudSyncService.syncNow().then(() => {
        setCloudSync(cloudSyncService.getConfig());
      }).catch(console.error);
    }
  };

  // Delete Multiple Expenses (Bulk Delete)
  const handleDeleteMultipleExpenses = async (ids: string[]) => {
    await dbService.deleteMultipleExpenses(ids);
    await refreshVaultData();

    if (cloudSync.enabled) {
      cloudSyncService.syncNow().then(() => {
        setCloudSync(cloudSyncService.getConfig());
      }).catch(console.error);
    }
  };

  // Update Existing Expense
  const handleUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    await dbService.updateExpense(id, updates);
    await refreshVaultData();

    if (cloudSync.enabled) {
      cloudSyncService.syncNow().then(() => {
        setCloudSync(cloudSyncService.getConfig());
      }).catch(console.error);
    }
  };

  // Open Edit Expense Modal
  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  // Update Category
  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    await dbService.updateCategory(id, updates);
    await refreshVaultData();
  };

  // Add Category
  const handleAddCategory = async (newCategory: Omit<Category, 'id'>) => {
    await dbService.addCategory(newCategory);
    await refreshVaultData();
  };

  // Recurring Expenses Handlers
  const handleAddRecurringExpense = async (
    item: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    await dbService.addRecurringExpense(item);
    await refreshVaultData();
  };

  const handleUpdateRecurringExpense = async (
    id: string,
    updates: Partial<RecurringExpense>
  ) => {
    await dbService.updateRecurringExpense(id, updates);
    await refreshVaultData();
  };

  const handleDeleteRecurringExpense = async (id: string) => {
    await dbService.deleteRecurringExpense(id);
    await refreshVaultData();
  };

  const handleProcessRecurringNow = async (): Promise<number> => {
    const result = await dbService.processRecurringExpenses(selectedMonth);
    await refreshVaultData();
    return result.addedCount;
  };

  // Update Metadata
  const handleUpdateMetadata = async (updates: Partial<VaultMetadata>) => {
    const updated = await dbService.updateMetadata(updates);
    setMetadata({ ...updated });
    await refreshVaultData();
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center p-4 text-slate-300">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white">Opening Secure Vault...</p>
          <p className="text-xs text-slate-400">Decrypting local AES-256 database (₹ INR)</p>
        </div>
      </div>
    );
  }

  // Error state
  if (initError) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[#161B26] border border-rose-900/50 shadow-2xl space-y-4 text-center">
          <h2 className="text-lg font-bold text-rose-400">Database Error</h2>
          <p className="text-xs text-slate-300">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Passcode Lock Screen
  if (isLocked) {
    return <PasscodeUnlockScreen onUnlock={handleUnlock} />;
  }

  // Standalone Widget Mode (when user opens ?mode=widget)
  if (isStandaloneWidgetMode) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-200 flex flex-col justify-center items-center p-4">
        <HomeScreenWidget
          categories={categories}
          expenses={expenses}
          onQuickAdd={handleWidgetQuickAdd}
          onFullAdd={handleAddExpense}
          onOpenQuickAddModal={() => setIsQuickAddOpen(true)}
          onOpenGuideModal={() => setIsWidgetGuideOpen(true)}
          isStandaloneWidgetMode={true}
          onCloseWidgetMode={() => setIsStandaloneWidgetMode(false)}
        />
        {/* Quick Add Modal */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          categories={categories}
          defaultCategoryId={quickAddDefaultCategory}
          onClose={() => setIsQuickAddOpen(false)}
          onSave={handleAddExpense}
        />
        {/* Widget Guide Modal */}
        <WidgetGuideModal
          isOpen={isWidgetGuideOpen}
          onClose={() => setIsWidgetGuideOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Header */}
      <Header
        metadata={metadata}
        cloudSync={cloudSync}
        isOnline={isOnline}
        recurringCount={recurringExpenses.filter((r) => r.isActive).length}
        onOpenQuickAdd={() => {
          setQuickAddDefaultCategory(undefined);
          setIsQuickAddOpen(true);
        }}
        onOpenWidgetMode={() => setIsStandaloneWidgetMode(true)}
        onOpenVaultSettings={() => setIsVaultSettingsOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onOpenRecurring={() => setIsRecurringOpen(true)}
        onLockVault={handleLockVault}
      />

      {/* PWA Install Banner */}
      <PWAInstallBanner onOpenWidgetGuide={() => setIsWidgetGuideOpen(true)} />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 pb-28 sm:pb-8">
        {/* Mobile Front "Add Expense" Card - Immediately visible on mobile without scrolling */}
        <div className="sm:hidden p-4 rounded-3xl bg-gradient-to-br from-indigo-900/90 via-[#161B26] to-[#0B0F17] border border-indigo-500/40 shadow-xl shadow-black/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                Fast Pocket Logger
              </span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Safe on Device
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-white">Spent pocket money?</h2>
              <p className="text-xs text-slate-300">Tap to record what you bought</p>
            </div>
            <button
              onClick={() => {
                setQuickAddDefaultCategory(undefined);
                setIsQuickAddOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/40 flex items-center gap-1.5 active:scale-95 transition shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add</span>
            </button>
          </div>

          {/* 1-tap fast presets for mobile front card */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-indigo-500/20">
            {[
              { label: 'Snacks', amt: 20, cat: 'cat_food' },
              { label: 'Pen/Book', amt: 30, cat: 'cat_shopping' },
              { label: 'Bus/Auto', amt: 20, cat: 'cat_transport' },
              { label: 'Treat', amt: 25, cat: 'cat_food' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleWidgetQuickAdd(preset.amt, preset.cat, preset.label)}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#161B26] hover:bg-[#1E2533] border border-indigo-500/20 text-center active:scale-90 transition"
              >
                <span className="text-[10px] text-slate-300 truncate w-full">{preset.label}</span>
                <span className="text-xs font-bold text-emerald-400">₹{preset.amt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Home Screen Widget Component with Full Add Support */}
        <HomeScreenWidget
          categories={categories}
          expenses={expenses}
          onQuickAdd={handleWidgetQuickAdd}
          onFullAdd={handleAddExpense}
          onOpenQuickAddModal={() => setIsQuickAddOpen(true)}
          onOpenGuideModal={() => setIsWidgetGuideOpen(true)}
        />

        {/* Visual Line Chart Card: Annual Spending Trend over Current Year (Recharts) */}
        <YearlySpendingTrend
          expenses={expenses}
          categories={categories}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />

        {/* Monthly Spending Insights, Customizable Budgets & Recurring Fixed Commitments */}
        <MonthlyInsights
          categories={categories}
          expenses={expenses}
          recurringExpenses={recurringExpenses}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          onOpenBudgetManager={() => setIsBudgetManagerOpen(true)}
          onOpenRecurringModal={() => setIsRecurringOpen(true)}
          onSelectCategoryFilter={(catId) => setSelectedCategoryFilter(catId)}
        />

        {/* Filterable, Searchable Expense Transactions List with Always-Visible Delete and Tap-to-Edit */}
        <ExpenseList
          expenses={expenses}
          categories={categories}
          selectedCategoryId={selectedCategoryFilter}
          selectedMonth={selectedMonth}
          onDeleteExpense={handleDeleteExpense}
          onDeleteMultipleExpenses={handleDeleteMultipleExpenses}
          onEditExpense={handleOpenEditExpense}
          onOpenQuickAdd={(catId) => {
            setQuickAddDefaultCategory(catId);
            setIsQuickAddOpen(true);
          }}
          onClearCategoryFilter={() => setSelectedCategoryFilter(undefined)}
        />
      </main>

      {/* Mobile Floating Action Button (Always in thumb-reach on mobile view) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
        <button
          onClick={() => {
            setQuickAddDefaultCategory(undefined);
            setIsQuickAddOpen(true);
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-2xl shadow-indigo-600/70 border border-indigo-400/40 flex items-center justify-center gap-2 active:scale-95 transition backdrop-blur-sm"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>Add New Expense (₹)</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1E2533] bg-[#0E131E] py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Zero-knowledge AES-256 local encrypted storage · Indian Rupee (₹) · No accounts · No ads
          </p>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              onClick={() => setIsRecurringOpen(true)}
              className="hover:text-indigo-400 transition"
            >
              Recurring Expenses
            </button>
            <span>•</span>
            <button
              onClick={() => setIsWidgetGuideOpen(true)}
              className="hover:text-indigo-400 transition"
            >
              Widget Guide
            </button>
            <span>•</span>
            <button
              onClick={() => setIsVaultSettingsOpen(true)}
              className="hover:text-indigo-400 transition"
            >
              Backup (.encdb)
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        categories={categories}
        defaultCategoryId={quickAddDefaultCategory}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={handleAddExpense}
      />

      <EditExpenseModal
        isOpen={isEditModalOpen}
        expense={editingExpense}
        categories={categories}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      <WidgetGuideModal
        isOpen={isWidgetGuideOpen}
        onClose={() => setIsWidgetGuideOpen(false)}
      />

      <RecurringExpensesModal
        isOpen={isRecurringOpen}
        recurringExpenses={recurringExpenses}
        categories={categories}
        selectedMonth={selectedMonth}
        onClose={() => setIsRecurringOpen(false)}
        onAddRecurringExpense={handleAddRecurringExpense}
        onUpdateRecurringExpense={handleUpdateRecurringExpense}
        onDeleteRecurringExpense={handleDeleteRecurringExpense}
        onProcessNow={handleProcessRecurringNow}
      />

      <BudgetManagerModal
        isOpen={isBudgetManagerOpen}
        categories={categories}
        onClose={() => setIsBudgetManagerOpen(false)}
        onUpdateCategory={handleUpdateCategory}
        onAddCategory={handleAddCategory}
      />

      <VaultSecurityModal
        isOpen={isVaultSettingsOpen}
        metadata={metadata}
        onClose={() => setIsVaultSettingsOpen(false)}
        onUpdateMetadata={handleUpdateMetadata}
        onRefreshData={refreshVaultData}
      />

      <CloudBackupModal
        isOpen={isCloudSyncOpen}
        cloudSync={cloudSync}
        onClose={() => setIsCloudSyncOpen(false)}
        onUpdateCloudSync={(updated) => setCloudSync(updated)}
        onRefreshData={refreshVaultData}
      />
    </div>
  );
}
