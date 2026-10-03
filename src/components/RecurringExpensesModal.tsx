import React, { useState } from 'react';
import {
  X,
  Repeat,
  Plus,
  Trash2,
  Check,
  Calendar,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Tag,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Category, PaymentMethod, RecurringExpense } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR } from '../utils/formatCurrency';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  recurringExpenses: RecurringExpense[];
  categories: Category[];
  selectedMonth: string; // YYYY-MM
  onClose: () => void;
  onAddRecurringExpense: (item: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => Promise<void>;
  onDeleteRecurringExpense: (id: string) => Promise<void>;
  onProcessNow: () => Promise<number>;
}

const PAYMENT_METHOD_OPTIONS: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'bank_transfer', label: 'Bank Transfer / NetBanking', icon: Building2 },
  { id: 'mobile_pay', label: 'UPI / Mobile Pay', icon: Smartphone },
  { id: 'credit_card', label: 'Credit Card Autopay', icon: CreditCard },
  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'other', label: 'Other', icon: Tag },
];

const RECURRING_PRESETS = [
  { name: 'House / Flat Rent', amount: 18000, categoryId: 'cat_housing', day: 1, method: 'bank_transfer' as PaymentMethod },
  { name: 'WiFi / Fiber Broadband', amount: 999, categoryId: 'cat_subscriptions', day: 5, method: 'credit_card' as PaymentMethod },
  { name: 'OTT Video / Music Pack', amount: 499, categoryId: 'cat_subscriptions', day: 10, method: 'mobile_pay' as PaymentMethod },
  { name: 'Electricity & Utilities', amount: 2500, categoryId: 'cat_housing', day: 15, method: 'mobile_pay' as PaymentMethod },
  { name: 'Gym / Fitness Club', amount: 1500, categoryId: 'cat_health', day: 1, method: 'mobile_pay' as PaymentMethod },
  { name: 'Mobile Postpaid Recharge', amount: 399, categoryId: 'cat_subscriptions', day: 8, method: 'credit_card' as PaymentMethod },
  { name: 'Milk & Groceries Basket', amount: 2500, categoryId: 'cat_groceries', day: 1, method: 'mobile_pay' as PaymentMethod },
];

export const RecurringExpensesModal: React.FC<RecurringExpensesModalProps> = ({
  isOpen,
  recurringExpenses,
  categories,
  selectedMonth,
  onClose,
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  onProcessNow,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate current month display name
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Totals
  const activeItems = recurringExpenses.filter((r) => r.isActive);
  const totalMonthlyCommitment = activeItems.reduce((sum, r) => sum + r.amount, 0);

  const handleApplyPreset = (preset: typeof RECURRING_PRESETS[0]) => {
    setName(preset.name);
    setAmount(preset.amount.toString());
    const matchedCat = categories.find((c) => c.id === preset.categoryId) || categories[0];
    if (matchedCat) setCategoryId(matchedCat.id);
    setDayOfMonth(preset.day);
    setPaymentMethod(preset.method);
    setShowAddForm(true);
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || !parsedAmount || parsedAmount <= 0) return;

    try {
      setIsProcessing(true);
      await onAddRecurringExpense({
        name: name.trim(),
        amount: parsedAmount,
        categoryId: categoryId || categories[0]?.id || '',
        dayOfMonth: Math.min(31, Math.max(1, dayOfMonth)),
        paymentMethod,
        isActive: true,
      });

      setName('');
      setAmount('');
      setShowAddForm(false);
      setFeedbackMessage('Recurring expense added! It will automatically log to your monthly expense sheet.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.error('Failed to create recurring expense', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await onUpdateRecurringExpense(id, { isActive: !currentActive });
  };

  const handleProcessNow = async () => {
    try {
      setIsProcessing(true);
      const added = await onProcessNow();
      if (added > 0) {
        setFeedbackMessage(`Successfully auto-added ${added} recurring expense(s) to ${monthName}!`);
      } else {
        setFeedbackMessage(`All active recurring expenses are already logged for ${monthName}.`);
      }
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      console.error('Failed to process recurring expenses', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Recurring Fixed Expenses</h2>
              <p className="text-xs text-slate-400">
                Monthly subscriptions, rent, and fixed bills automatically added to your log
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commitment Summary Banner */}
        <div className="px-5 py-3.5 bg-[#0B0F17] border-b border-[#222A3A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-slate-400 block">Total Monthly Fixed Commitment</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 tracking-tight">
                {formatINR(totalMonthlyCommitment)}
              </span>
              <span className="text-xs text-slate-400">/ month ({activeItems.length} active)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleProcessNow}
              disabled={isProcessing || activeItems.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/60 text-xs font-semibold transition active:scale-95 disabled:opacity-40"
              title={`Check and log pending fixed costs for ${monthName}`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Auto-Log for {monthName}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{showAddForm ? 'Cancel' : 'New Fixed Cost'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {feedbackMessage && (
          <div className="mx-5 mt-3 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Quick Presets Carousel */}
          {!showAddForm && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Quick Setup Presets (Indian Context)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RECURRING_PRESETS.slice(0, 4).map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E2533] border border-[#222A3A] hover:border-indigo-500/40 text-left transition group active:scale-95"
                  >
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white block truncate">
                      {preset.name}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                      {formatINR(preset.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add / Edit Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateRecurring}
              className="p-4 rounded-2xl bg-[#0B0F17] border border-indigo-500/40 space-y-3.5 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Define Recurring Fixed Expense
                </span>
                <span className="text-[11px] text-slate-400">Repeats every month</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Expense Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House Rent, Netflix 4K, Gym..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Amount in INR */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Monthly Fixed Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 18000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recurrence Day */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Day of Month (1 - 31)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-3 py-2 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition text-center"
                    />
                    <span className="text-xs text-slate-400">
                      Day {dayOfMonth} of every month
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Auto-Debit / Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    {PAYMENT_METHOD_OPTIONS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#222A3A]">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30"
                >
                  Save Recurring Expense
                </button>
              </div>
            </form>
          )}

          {/* Recurring Expenses List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Scheduled Fixed Costs ({recurringExpenses.length})
              </span>
              <span className="text-xs text-slate-400">
                {activeItems.length} active · {recurringExpenses.length - activeItems.length} paused
              </span>
            </div>

            {recurringExpenses.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-2">
                <Repeat className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-semibold text-white">No recurring expenses set up yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Add monthly rent, subscriptions, or EMIs. They will automatically be recorded into your offline database each month.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Fixed Cost</span>
                </button>
              </div>
            ) : (
              recurringExpenses.map((rec) => {
                const cat = categories.find((c) => c.id === rec.categoryId) || {
                  id: 'unknown',
                  name: 'Uncategorized',
                  icon: 'Tag',
                  color: '#64748b',
                  budgetLimit: 0,
                };
                const pm = PAYMENT_METHOD_OPTIONS.find((p) => p.id === rec.paymentMethod) || PAYMENT_METHOD_OPTIONS[0];
                const MethodIcon = pm.icon;
                const isAppliedCurrentMonth = rec.lastAppliedMonth === selectedMonth;

                return (
                  <div
                    key={rec.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl bg-[#0B0F17] border transition ${
                      rec.isActive ? 'border-[#222A3A] hover:border-[#2E3A4E]' : 'border-[#222A3A]/40 opacity-60'
                    }`}
                  >
                    {/* Left: Icon & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} size={18} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {rec.name}
                          </span>
                          {isAppliedCurrentMonth && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                              Logged for {monthName.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-medium" style={{ color: cat.color }}>
                            {cat.name}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {rec.dayOfMonth === 1 ? '1st' : rec.dayOfMonth === 2 ? '2nd' : rec.dayOfMonth === 3 ? '3rd' : `${rec.dayOfMonth}th`} of month
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 hidden xs:inline-flex">
                            <MethodIcon className="w-3 h-3" />
                            {pm.label.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-sm sm:text-base font-extrabold text-white tracking-tight block">
                          {formatINR(rec.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400">fixed / month</span>
                      </div>

                      {/* Active/Pause Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rec.id, rec.isActive)}
                        className={`p-1.5 rounded-xl border transition ${
                          rec.isActive
                            ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50 hover:bg-emerald-900/40'
                            : 'text-slate-500 bg-[#161B26] border-[#222A3A] hover:text-slate-300'
                        }`}
                        title={rec.isActive ? 'Pause recurring expense' : 'Resume recurring expense'}
                      >
                        {rec.isActive ? (
                          <PlayCircle className="w-4 h-4 fill-emerald-500/20" />
                        ) : (
                          <PauseCircle className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeleteRecurringExpense(rec.id)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        title="Delete recurring fixed expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Privacy & Automation Note */}
          <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#222A3A] flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="text-white font-medium">Automatic & 100% Offline: </span>
              Every time you open ExpenseVault, active recurring expenses are verified against your encrypted local storage. When a new month arrives, your rent and fixed subscriptions are automatically recorded with zero network transmission.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#222A3A] bg-[#161B26] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {activeItems.length} active recurring commitments
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
