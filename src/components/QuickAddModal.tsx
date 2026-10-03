import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Delete,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Category, Expense, PaymentMethod } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { suggestCategoryFromNote } from '../utils/categorySuggester';

interface QuickAddModalProps {
  isOpen: boolean;
  categories: Category[];
  currencySymbol?: string;
  defaultCategoryId?: string;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'mobile_pay', label: 'UPI / Mobile', icon: Smartphone },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
];

// Student & daily friendly quick amount chips
const PRESET_AMOUNTS = [20, 50, 100, 200, 500];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  categories,
  defaultCategoryId,
  onClose,
  onSave,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    defaultCategoryId || categories[0]?.id || ''
  );
  const [userManuallySelectedCategory, setUserManuallySelectedCategory] = useState(false);
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useKeypad, setUseKeypad] = useState(false); // default to simple clean standard input for simplicity
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Auto-suggestion from note keywords
  const categorySuggestion = useMemo(() => {
    return suggestCategoryFromNote(note, categories);
  }, [note, categories]);

  // When note changes, if user hasn't explicitly clicked a category, auto-apply suggestion!
  useEffect(() => {
    if (categorySuggestion && !userManuallySelectedCategory) {
      setSelectedCategoryId(categorySuggestion.category.id);
    }
  }, [categorySuggestion, userManuallySelectedCategory]);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setNote('');
      setUserManuallySelectedCategory(false);
      setShowMoreOptions(false);
      setDate(new Date().toISOString().slice(0, 10));
      if (defaultCategoryId) {
        setSelectedCategoryId(defaultCategoryId);
        setUserManuallySelectedCategory(true);
      } else if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
    }
  }, [isOpen, defaultCategoryId, categories]);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setAmountStr('');
      return;
    }
    if (val === 'DEL') {
      setAmountStr((prev) => prev.slice(0, -1));
      return;
    }
    if (val === '.') {
      if (amountStr.includes('.')) return;
      setAmountStr((prev) => (prev === '' ? '0.' : prev + '.'));
      return;
    }
    const parts = amountStr.split('.');
    if (parts[1] && parts[1].length >= 2) return;
    if (amountStr.length >= 8) return;

    setAmountStr((prev) => prev + val);
  };

  const handleQuickPreset = (preset: number) => {
    const current = parseFloat(amountStr) || 0;
    // Tapping a preset adds it, or sets it if empty
    if (!amountStr || current === 0) {
      setAmountStr(preset.toString());
    } else {
      setAmountStr((current + preset).toString());
    }
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setUserManuallySelectedCategory(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const category = categories.find((c) => c.id === selectedCategoryId) || categories[0];
    const finalNote = note.trim() || category.name;

    try {
      setIsSubmitting(true);
      await onSave({
        amount: Math.round(parsedAmount * 100) / 100,
        categoryId: selectedCategoryId || category.id,
        date,
        time: new Date().toTimeString().slice(0, 5),
        note: finalNote,
        paymentMethod,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        id="quick-add-card"
        className="w-full max-w-lg rounded-3xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto"
      >
        {/* Simple friendly header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: selectedCategory?.color || '#6366f1' }}
            >
              <CategoryIcon name={selectedCategory?.icon || 'Tag'} size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Add New Expense</h2>
              <p className="text-xs text-slate-400">Save what you spent in 2 simple taps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* STEP 1: How much did you spend? */}
          <div className="rounded-2xl bg-[#0B0F17] p-4 border border-[#222A3A] flex flex-col items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              How much did you spend?
            </span>
            <div className="flex items-center justify-center gap-1.5 text-emerald-400">
              <span className="text-3xl font-extrabold">₹</span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="0"
                autoFocus
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-44 text-4xl sm:text-5xl font-extrabold bg-transparent text-emerald-400 focus:outline-none text-center placeholder:text-slate-700"
              />
            </div>

            {/* Quick 1-tap add chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 w-full">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickPreset(amt)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1E2533] hover:bg-[#262F40] text-slate-200 border border-[#222A3A] hover:border-indigo-500/50 transition active:scale-95"
                >
                  +₹{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseKeypad(!useKeypad)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-[#161B26] border border-[#222A3A] transition"
              >
                {useKeypad ? '⌨️ Keyboard' : '🔢 Keypad'}
              </button>
            </div>
          </div>

          {/* Optional Keypad */}
          {useKeypad && (
            <div className="grid grid-cols-3 gap-2 bg-[#0B0F17] p-3 rounded-2xl border border-[#222A3A]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className={`h-11 rounded-xl text-lg font-semibold flex items-center justify-center transition active:scale-95 ${
                    key === 'DEL'
                      ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-900/40'
                      : 'bg-[#1E2533] hover:bg-[#262F40] text-slate-100 hover:text-white border border-[#222A3A]'
                  }`}
                >
                  {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: What did you buy? (With Smart Auto-Suggestion) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                What did you buy?
              </label>
              <span className="text-[11px] text-slate-500">Auto-finds category!</span>
            </div>
            <input
              type="text"
              placeholder="e.g. Samosa, Notebook, Pen, Bus ticket..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />

            {/* Smart Keyword Suggestion Banner */}
            {categorySuggestion && (
              <div className="mt-2 p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/40 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${categorySuggestion.category.color}30`, color: categorySuggestion.category.color }}
                  >
                    <CategoryIcon name={categorySuggestion.category.icon} size={14} />
                  </div>
                  <span className="text-xs text-indigo-200 truncate">
                    {selectedCategoryId === categorySuggestion.category.id ? (
                      <>
                        ✨ Auto-selected <b>{categorySuggestion.category.name}</b> (from "{categorySuggestion.matchedKeyword}")
                      </>
                    ) : (
                      <>
                        💡 Suggested: <b>{categorySuggestion.category.name}</b> (from "{categorySuggestion.matchedKeyword}")
                      </>
                    )}
                  </span>
                </div>

                {selectedCategoryId !== categorySuggestion.category.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(categorySuggestion.category.id);
                      setUserManuallySelectedCategory(false);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shrink-0 transition"
                  >
                    Use
                  </button>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: Choose Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition text-xs font-medium border active:scale-95 ${
                      isSelected
                        ? 'bg-[#1E2533] border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/50'
                        : 'bg-[#0B0F17] border-[#222A3A] text-slate-300 hover:bg-[#1E2533] hover:border-[#2E3A4E]'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} size={15} />
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simple toggle for optional details (Payment method & Date) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 font-medium transition"
            >
              <span>{showMoreOptions ? '− Hide extra details' : '+ Extra options (Cash/UPI, date)'}</span>
            </button>

            {showMoreOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 animate-in fade-in">
                {/* Payment Method */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    How was it paid?
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

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Big, friendly Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!parseFloat(amountStr) || isSubmitting}
              className="w-full py-3.5 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-white shadow-xl shadow-indigo-600/30 transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Saving...' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
