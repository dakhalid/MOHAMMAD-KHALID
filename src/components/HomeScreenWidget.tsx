import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Zap,
  Check,
  Shield,
  ArrowRight,
  Plus,
  Sparkles,
  Calendar,
  CreditCard,
  Banknote,
  Building2,
  Tag,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Category, Expense, PaymentMethod } from '../types';
import { formatINR } from '../utils/formatCurrency';
import { suggestCategoryFromNote } from '../utils/categorySuggester';
import { CategoryIcon } from './CategoryIcon';

interface HomeScreenWidgetProps {
  categories: Category[];
  expenses: Expense[];
  currencySymbol?: string;
  onQuickAdd: (amount: number, categoryId: string, note: string) => Promise<void>;
  onFullAdd?: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onOpenQuickAddModal: () => void;
  onOpenGuideModal: () => void;
  isStandaloneWidgetMode?: boolean;
  onCloseWidgetMode?: () => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'mobile_pay', label: 'UPI / Mobile', icon: Smartphone },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { id: 'other', label: 'Other', icon: Tag },
];

export const HomeScreenWidget: React.FC<HomeScreenWidgetProps> = ({
  categories,
  expenses,
  onQuickAdd,
  onFullAdd,
  onOpenQuickAddModal,
  onOpenGuideModal,
  isStandaloneWidgetMode = false,
  onCloseWidgetMode,
}) => {
  const [selectedQuickCatId, setSelectedQuickCatId] = useState<string>(categories[0]?.id || '');
  const [userSelectedCategoryManually, setUserSelectedCategoryManually] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_pay');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [justAddedNote, setJustAddedNote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate today's total spending
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const todaysExpenses = expenses.filter((e) => e.date === todayStr);
  const todayTotal = todaysExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Class 6 & everyday student-friendly quick presets (1-tap)
  const quickPresets = [
    { label: 'Snacks / Canteen', amount: 30, categoryId: 'cat_food' },
    { label: 'Pen & Notebook', amount: 40, categoryId: 'cat_shopping' },
    { label: 'Bus / Auto Fare', amount: 20, categoryId: 'cat_transport' },
    { label: 'Juice / Treat', amount: 25, categoryId: 'cat_food' },
  ];

  // Smart auto-suggestion from note in widget
  const categorySuggestion = useMemo(() => {
    return suggestCategoryFromNote(note, categories);
  }, [note, categories]);

  const handleNoteChange = (val: string) => {
    setNote(val);
    if (!userSelectedCategoryManually) {
      const suggestion = suggestCategoryFromNote(val, categories);
      if (suggestion) {
        setSelectedQuickCatId(suggestion.category.id);
      }
    }
  };

  const handle1TapQuickAdd = async (preset: { label: string; amount: number; categoryId: string }) => {
    const cat = categories.find((c) => c.id === preset.categoryId) || categories[0];
    try {
      setIsSubmitting(true);
      if (onFullAdd) {
        await onFullAdd({
          amount: preset.amount,
          categoryId: cat.id,
          note: preset.label,
          paymentMethod: 'cash',
          date: todayStr,
          time: new Date().toTimeString().slice(0, 5),
        });
      } else {
        await onQuickAdd(preset.amount, cat.id, preset.label);
      }
      setJustAddedNote(`Saved! ${formatINR(preset.amount)} for ${preset.label}`);
      setTimeout(() => setJustAddedNote(null), 3500);
    } catch (err) {
      console.error('Failed 1-tap add', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWidgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (!parsedAmt || isNaN(parsedAmt) || parsedAmt <= 0) return;

    const cat = categories.find((c) => c.id === selectedQuickCatId) || categories[0];
    const finalNote = note.trim() || cat.name;

    try {
      setIsSubmitting(true);
      if (onFullAdd) {
        await onFullAdd({
          amount: Math.round(parsedAmt * 100) / 100,
          categoryId: cat.id,
          note: finalNote,
          paymentMethod,
          date: date || todayStr,
          time: time || new Date().toTimeString().slice(0, 5),
        });
      } else {
        await onQuickAdd(parsedAmt, cat.id, finalNote);
      }

      setAmount('');
      setNote('');
      setUserSelectedCategoryManually(false);
      setJustAddedNote(`Saved! ${formatINR(parsedAmt)} for ${finalNote}`);
      setTimeout(() => setJustAddedNote(null), 3500);
    } catch (err) {
      console.error('Failed to log expense from widget', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategory = categories.find((c) => c.id === selectedQuickCatId) || categories[0];

  return (
    <div className={`w-full ${isStandaloneWidgetMode ? 'max-w-md mx-auto p-3 sm:p-4' : ''}`}>
      {/* Widget Container card - Fully responsive for mobile & desktop */}
      <div
        id="home-screen-widget-frame"
        className="relative overflow-hidden rounded-3xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/50 p-4 sm:p-6"
      >
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Widget Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Quick Pocket Widget
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGuideModal}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E2533] text-indigo-300 border border-indigo-500/30 transition active:scale-95"
              title="Add Widget to iPhone / Android Home Screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xs:inline">Add to Phone Home</span>
            </button>
            {isStandaloneWidgetMode && onCloseWidgetMode && (
              <button
                onClick={onCloseWidgetMode}
                className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#1E2533]"
              >
                Done
              </button>
            )}
          </div>
        </div>

        {/* Feedback alert toast */}
        {justAddedNote && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-150 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{justAddedNote}</span>
          </div>
        )}

        {/* Today's Spend Stat Row */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] mb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Spent Today</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatINR(todayTotal)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Today's Entries</div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-400">
              {todaysExpenses.length} {todaysExpenses.length === 1 ? 'record' : 'records'}
            </div>
          </div>
        </div>

        {/* 1-Tap Quick Action Buttons */}
        <div className="mb-4">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Tap Fast Spend</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handle1TapQuickAdd(preset)}
                className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#1E2533] hover:bg-[#262F40] hover:border-indigo-500/50 border border-[#222A3A] transition active:scale-95 text-center group"
              >
                <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate w-full">
                  {preset.label}
                </span>
                <span className="text-sm font-extrabold text-emerald-400 mt-0.5">
                  {formatINR(preset.amount, { showDecimals: false })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Complete In-Widget Expense Entry Form With ALL OPTIONS */}
        <form onSubmit={handleWidgetSubmit} className="pt-4 border-t border-[#222A3A] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Expense (All Options Available)
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Auto-saves to offline vault
            </span>
          </div>

          {/* Option 1 & 2: Amount & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Amount input */}
            <div className="sm:col-span-5 relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-extrabold text-emerald-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-lg text-emerald-400 font-extrabold placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </div>

              {/* Quick amount chips */}
              <div className="flex items-center gap-1.5 mt-2">
                {[10, 50, 100, 500].map((addVal) => (
                  <button
                    key={addVal}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(amount) || 0;
                      setAmount((cur + addVal).toString());
                    }}
                    className="flex-1 py-1 rounded-lg bg-[#0B0F17] hover:bg-[#1E2533] border border-[#222A3A] text-[11px] font-bold text-slate-300 hover:text-white transition active:scale-95"
                  >
                    +₹{addVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Note / Description */}
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                What did you buy? (Item / Note)
              </label>
              <input
                type="text"
                placeholder="e.g. Samosa, Bus ticket, Notebook, Milk..."
                value={note}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
              />

              {/* Smart Auto-Suggestion Feedback Badge */}
              {categorySuggestion && (
                <div className="mt-2 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-between text-xs text-indigo-300 animate-in fade-in">
                  <span className="truncate">
                    ✨ Suggested: <b>{categorySuggestion.category.name}</b> (from "{categorySuggestion.matchedKeyword}")
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuickCatId(categorySuggestion.category.id);
                      setUserSelectedCategoryManually(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 ml-1.5 active:scale-95 transition"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Option 3: Category Selector (Grid of Categories) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
              {categories.map((cat) => {
                const isSelected = selectedQuickCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuickCatId(cat.id);
                      setUserSelectedCategoryManually(true);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition border shrink-0 active:scale-95 ${
                      isSelected
                        ? 'bg-[#1E2533] border-indigo-500 text-white ring-1 ring-indigo-500/50 shadow-md'
                        : 'bg-[#0B0F17] border-[#222A3A] text-slate-300 hover:bg-[#1E2533] hover:text-white'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} size={13} />
                    </div>
                    <span className="text-xs font-semibold truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 4: Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon;
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-[#0B0F17] text-slate-300 border-[#222A3A] hover:bg-[#1E2533]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 5 & 6: Date & Time Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Transaction Date
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    date === todayStr
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300'
                      : 'bg-[#0B0F17] border-[#222A3A] text-slate-400 hover:text-white'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayStr)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    date === yesterdayStr
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300'
                      : 'bg-[#0B0F17] border-[#222A3A] text-slate-400 hover:text-white'
                  }`}
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Time (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!parseFloat(amount) || isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-extrabold transition shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Save Expense to Vault (₹)</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#222A3A] pt-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            100% Private · Encrypted on Device
          </span>
          <button
            type="button"
            onClick={onOpenGuideModal}
            className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
          >
            Widget Guide
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
