import React, { useState, useMemo } from 'react';
import {
  Search,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Tag,
  Plus,
  Repeat,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Check,
  Filter,
} from 'lucide-react';
import { Category, Expense, PaymentMethod } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR } from '../utils/formatCurrency';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  currencySymbol?: string;
  selectedCategoryId?: string;
  selectedMonth: string;
  onDeleteExpense: (id: string) => Promise<void>;
  onDeleteMultipleExpenses?: (ids: string[]) => Promise<void>;
  onEditExpense: (expense: Expense) => void;
  onOpenQuickAdd: (categoryId?: string) => void;
  onClearCategoryFilter?: () => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: React.FC<{ className?: string }> }> = {
  mobile_pay: { label: 'UPI / Mobile', icon: Smartphone },
  cash: { label: 'Cash', icon: Banknote },
  debit_card: { label: 'Debit Card', icon: CreditCard },
  credit_card: { label: 'Credit Card', icon: CreditCard },
  bank_transfer: { label: 'Bank Transfer', icon: Building2 },
  other: { label: 'Other', icon: Tag },
};

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  selectedCategoryId,
  selectedMonth,
  onDeleteExpense,
  onDeleteMultipleExpenses,
  onEditExpense,
  onOpenQuickAdd,
  onClearCategoryFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>(selectedCategoryId || 'all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'recurring' | 'one_time'>('all');
  const [monthScope, setMonthScope] = useState<'current' | 'all'>('current');
  const [sortBy, setSortBy] = useState<'date_desc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Single delete confirm state (tracks which ID is being confirmed)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync external category filter if passed
  React.useEffect(() => {
    if (selectedCategoryId) {
      setCatFilter(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter expenses matching current month/all, category, method, recurring type, search
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        // Month filter
        if (monthScope === 'current' && selectedMonth && !e.date.startsWith(selectedMonth)) {
          return false;
        }

        // Category filter
        if (catFilter !== 'all' && e.categoryId !== catFilter) return false;

        // Payment method filter
        if (methodFilter !== 'all' && e.paymentMethod !== methodFilter) return false;

        // Recurring filter
        if (typeFilter === 'recurring' && !e.tags?.includes('recurring')) return false;
        if (typeFilter === 'one_time' && e.tags?.includes('recurring')) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const categoryName = categoryMap.get(e.categoryId)?.name.toLowerCase() || '';
          const noteMatch = e.note.toLowerCase().includes(q);
          const catMatch = categoryName.includes(q);
          const amountMatch = e.amount.toString().includes(q);
          if (!noteMatch && !catMatch && !amountMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt;
        }
        if (sortBy === 'amount_desc') {
          return b.amount - a.amount;
        }
        return a.amount - b.amount;
      });
  }, [expenses, monthScope, selectedMonth, catFilter, methodFilter, typeFilter, searchQuery, sortBy, categoryMap]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { dateStr: string; formattedDate: string; items: Expense[]; subtotal: number }[] = [];
    const dateMap = new Map<string, Expense[]>();

    filteredExpenses.forEach((exp) => {
      const list = dateMap.get(exp.date) || [];
      list.push(exp);
      dateMap.set(exp.date, list);
    });

    dateMap.forEach((items, dateStr) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      let formattedDate = dateStr;
      if (dateStr === todayStr) {
        formattedDate = 'Today';
      } else if (dateStr === yesterday) {
        formattedDate = 'Yesterday';
      } else {
        const [y, m, d] = dateStr.split('-');
        const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        formattedDate = dt.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: dt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
      }

      const subtotal = items.reduce((s, i) => s + i.amount, 0);
      groups.push({ dateStr, formattedDate, items, subtotal });
    });

    return groups;
  }, [filteredExpenses]);

  // Multi-select helpers
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const selectedTotalAmount = useMemo(() => {
    return filteredExpenses
      .filter((e) => selectedIds.has(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses, selectedIds]);

  const handleConfirmBulkDelete = async () => {
    if (!onDeleteMultipleExpenses || selectedIds.size === 0) return;
    try {
      setIsDeletingBulk(true);
      await onDeleteMultipleExpenses(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
    } catch (err) {
      console.error('Failed to bulk delete expenses', err);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleConfirmSingleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onDeleteExpense(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col gap-3 bg-[#161B26] border border-[#222A3A] rounded-3xl p-4 sm:p-5 shadow-xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Title & Count */}
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Recorded Expenses</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#0B0F17] border border-[#222A3A] text-slate-300">
              {filteredExpenses.length}
            </span>
            {catFilter !== 'all' && (
              <button
                onClick={() => {
                  setCatFilter('all');
                  if (onClearCategoryFilter) onClearCategoryFilter();
                }}
                className="text-xs text-indigo-400 hover:underline ml-1 font-semibold"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Quick Actions Header: Select All + Bulk Delete + Add */}
          <div className="flex flex-wrap items-center gap-2">
            {filteredExpenses.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
                  selectedIds.size > 0
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-[#0B0F17] text-slate-300 border-[#222A3A] hover:bg-[#1E2533]'
                }`}
                title="Select all visible expenses"
              >
                {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-white" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0
                    ? 'Deselect All'
                    : `Select All (${filteredExpenses.length})`}
                </span>
              </button>
            )}

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition active:scale-95"
                title="Delete all selected expenses"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}

            <button
              onClick={() => onOpenQuickAdd()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Add Expense</span>
            </button>
          </div>
        </div>

        {/* Selected Items Highlight Banner (When 1+ items are selected) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 shadow-inner animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                {selectedIds.size} of {filteredExpenses.length} expenses selected
              </span>
              <span className="text-xs font-extrabold text-emerald-400 ml-1">
                (Total: {formatINR(selectedTotalAmount)})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/10 transition"
              >
                Deselect
              </button>
              <button
                type="button"
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Month Scope Toggle (Current Month vs All History) */}
          <div className="flex items-center bg-[#0B0F17] rounded-xl p-0.5 border border-[#222A3A]">
            <button
              type="button"
              onClick={() => setMonthScope('current')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                monthScope === 'current'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setMonthScope('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                monthScope === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Records ({expenses.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-48 min-w-[130px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search note or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Category Filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition max-w-[140px] truncate"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Payment Methods</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date_desc' | 'amount_desc' | 'amount_asc')}
            className="px-2.5 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="date_desc">Latest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#161B26] border border-rose-900/60 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Multiple Expenses?</h3>
                <p className="text-xs text-slate-400">This will permanently delete the selected entries</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Selected Entries to Delete:</span>
                <span className="font-bold text-white">{selectedIds.size}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Total Amount:</span>
                <span className="font-extrabold text-rose-400">{formatINR(selectedTotalAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#1E2533]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isDeletingBulk}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition active:scale-95"
              >
                {isDeletingBulk ? 'Deleting...' : `Yes, Delete ${selectedIds.size} Entries`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense List Grouped By Date */}
      {groupedByDate.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0B0F17] border border-[#222A3A] text-slate-400 mx-auto flex items-center justify-center">
            <Calendar className="w-7 h-7 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">No expenses found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {monthScope === 'current'
                ? 'No transactions found for the selected month. Switch to "All Records" or add one with Quick Add.'
                : 'No transactions found matching your filters.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {monthScope === 'current' && (
              <button
                onClick={() => setMonthScope('all')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0B0F17] border border-[#222A3A] text-slate-300 hover:text-white"
              >
                View All Records ({expenses.length})
              </button>
            )}
            <button
              onClick={() => onOpenQuickAdd()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.dateStr} className="space-y-2">
              {/* Date Header with Day Subtotal */}
              <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400">
                <span className="text-slate-300 font-bold">{group.formattedDate}</span>
                <span className="font-mono text-[11px] text-slate-400">
                  Subtotal: {formatINR(group.subtotal)}
                </span>
              </div>

              {/* Transactions in date */}
              <div className="space-y-2.5">
                {group.items.map((exp) => {
                  const cat = categoryMap.get(exp.categoryId) || {
                    id: 'unknown',
                    name: 'Uncategorized',
                    icon: 'Tag',
                    color: '#64748b',
                    budgetLimit: 0,
                  };
                  const pm = PAYMENT_METHOD_LABELS[exp.paymentMethod] || PAYMENT_METHOD_LABELS.other;
                  const MethodIcon = pm.icon;
                  const isRecurring = exp.tags?.includes('recurring');
                  const isSelected = selectedIds.has(exp.id);
                  const isBeingDeleted = deletingId === exp.id;

                  return (
                    <div
                      key={exp.id}
                      onClick={() => {
                        // Tapping anywhere on the card opens Edit Expense Modal!
                        onEditExpense(exp);
                      }}
                      className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer select-none active:scale-[0.99] group ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                          : 'bg-[#161B26] border-[#222A3A] hover:border-indigo-500/50 hover:bg-[#1A202E] shadow-sm'
                      }`}
                    >
                      {/* Left: Checkbox + Category Icon + Note & Details */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
                        {/* Multi-select Checkbox (Always visible on every card) */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(exp.id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0 active:scale-95"
                          title={isSelected ? 'Deselect this expense' : 'Select to delete'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 hover:text-indigo-400" />
                          )}
                        </button>

                        {/* Category Icon */}
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                        >
                          <CategoryIcon name={cat.icon} size={18} />
                        </div>

                        {/* Note & Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {exp.note}
                            </span>
                            {isRecurring && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 shrink-0">
                                <Repeat className="w-2.5 h-2.5" />
                                Recurring
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 truncate">
                            <span className="font-semibold shrink-0" style={{ color: cat.color }}>
                              {cat.name}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <MethodIcon className="w-3 h-3" />
                              {pm.label}
                            </span>
                            {exp.time && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] shrink-0">{exp.time}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Always-Visible Delete Button */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 sm:gap-3 shrink-0"
                      >
                        <div
                          onClick={() => onEditExpense(exp)}
                          className="text-right cursor-pointer"
                          title="Tap card to edit"
                        >
                          <span className="text-sm sm:text-base font-extrabold text-white tracking-tight block">
                            -{formatINR(exp.amount)}
                          </span>
                          <span className="text-[10px] text-indigo-400/80 font-medium block">
                            Tap to edit
                          </span>
                        </div>

                        {/* Always-visible Delete Button with inline confirmation */}
                        {!isBeingDeleted ? (
                          <button
                            type="button"
                            onClick={() => setDeletingId(exp.id)}
                            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-900/40 text-xs font-semibold transition active:scale-95 shadow-sm flex items-center gap-1"
                            title="Delete this expense"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            <span className="hidden sm:inline text-xs">Delete</span>
                          </button>
                        ) : (
                          /* Inline Single Delete Confirm */
                          <div className="flex items-center gap-1 p-1 bg-[#0B0F17] rounded-xl border border-rose-900/70 animate-in fade-in">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmSingleDelete(exp.id, e)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-md"
                            >
                              Delete?
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Multi-Select Action Bar (Stickied at bottom on mobile & desktop when items are selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-3.5 rounded-2xl bg-[#161B26] border border-indigo-500 shadow-2xl shadow-black/80 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-white block">
                {selectedIds.size} expense(s) selected
              </span>
              <span className="text-xs text-emerald-400 font-extrabold">
                Total: {formatINR(selectedTotalAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#1E2533]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/40 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
