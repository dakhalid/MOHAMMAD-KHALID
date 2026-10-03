import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Banknote,
  Building2,
  Calendar,
  Clock,
  Tag,
} from 'lucide-react';
import { Category, Expense, PaymentMethod } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR } from '../utils/formatCurrency';
import { suggestCategoryFromNote } from '../utils/categorySuggester';

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  categories: Category[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Expense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'mobile_pay', label: 'UPI / Mobile', icon: Smartphone },
  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { id: 'other', label: 'Other', icon: Tag },
];

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  expense,
  categories,
  onClose,
  onSave,
  onDelete,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Sync state when expense opens
  useEffect(() => {
    if (expense) {
      setAmountStr(expense.amount.toString());
      setSelectedCategoryId(expense.categoryId);
      setNote(expense.note);
      setPaymentMethod(expense.paymentMethod || 'cash');
      setDate(expense.date);
      setTime(expense.time || '12:00');
      setShowConfirmDelete(false);
    }
  }, [expense]);

  // Keyword auto-suggestion
  const categorySuggestion = useMemo(() => {
    return suggestCategoryFromNote(note, categories);
  }, [note, categories]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      setIsSubmitting(true);
      await onSave(expense.id, {
        amount: Math.round(parsedAmount * 100) / 100,
        categoryId: selectedCategoryId || expense.categoryId,
        note: note.trim() || 'Expense',
        paymentMethod,
        date: date || expense.date,
        time: time || expense.time,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await onDelete(expense.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        id="edit-expense-card"
        className="w-full max-w-lg rounded-3xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: selectedCategory?.color || '#6366f1' }}
            >
              <CategoryIcon name={selectedCategory?.icon || 'Tag'} size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Edit Recorded Expense</h2>
              <p className="text-xs text-slate-400">Change details or remove this entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Amount Box */}
          <div className="rounded-2xl bg-[#0B0F17] p-4 border border-[#222A3A] flex flex-col items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Amount Spent
            </span>
            <div className="flex items-center justify-center gap-1.5 text-emerald-400">
              <span className="text-3xl font-extrabold">₹</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-48 text-4xl sm:text-5xl font-extrabold bg-transparent text-emerald-400 focus:outline-none text-center"
              />
            </div>

            {/* Quick Adjustment Chips */}
            <div className="flex items-center gap-2 mt-2">
              {[-50, -10, +10, +50].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(amountStr) || 0;
                    setAmountStr(Math.max(1, cur + delta).toString());
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1E2533] hover:bg-[#262F40] text-slate-300 border border-[#222A3A] active:scale-95 transition"
                >
                  {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              What did you buy?
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Samosa, Bus fare, Notebook..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />

            {/* Keyword Auto Suggestion */}
            {categorySuggestion && categorySuggestion.category.id !== selectedCategoryId && (
              <div className="mt-2 p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
                <span>
                  💡 Sounds like <b>{categorySuggestion.category.name}</b> (from "{categorySuggestion.matchedKeyword}")
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(categorySuggestion.category.id)}
                  className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition text-xs font-medium border active:scale-95 ${
                      isSelected
                        ? 'bg-[#1E2533] border-indigo-500 text-white ring-1 ring-indigo-500/50 shadow-sm'
                        : 'bg-[#0B0F17] border-[#222A3A] text-slate-300 hover:bg-[#1E2533]'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} size={14} />
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white text-xs focus:outline-none focus:border-indigo-500 transition"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Delete Confirmation Box */}
          {showConfirmDelete && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-900/60 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Delete this expense permanently?</span>
              </div>
              <p className="text-[11px] text-rose-200/80">
                This will remove {formatINR(expense.amount)} ({expense.note}) from your encrypted database.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-[#1E2533]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          )}

          {/* Actions Bottom Bar */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#222A3A]">
            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 border border-rose-900/50 text-xs font-semibold transition active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Expense</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#1E2533] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!parseFloat(amountStr) || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
