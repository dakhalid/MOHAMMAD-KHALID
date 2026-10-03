import React, { useState } from 'react';
import {
  X,
  Check,
  Plus,
  Sliders,
} from 'lucide-react';
import { Category } from '../types';
import { AVAILABLE_CATEGORY_ICONS, CategoryIcon } from './CategoryIcon';
import { formatINR } from '../utils/formatCurrency';

interface BudgetManagerModalProps {
  isOpen: boolean;
  categories: Category[];
  currencySymbol?: string;
  onClose: () => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onAddCategory: (category: Omit<Category, 'id'>) => Promise<void>;
}

const COLOR_PRESETS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#8b5cf6', // purple
  '#f97316', // orange
  '#ec4899', // pink
  '#eab308', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#d946ef', // fuchsia
  '#64748b', // slate
];

export const BudgetManagerModal: React.FC<BudgetManagerModalProps> = ({
  isOpen,
  categories,
  onClose,
  onUpdateCategory,
  onAddCategory,
}) => {
  const [editingBudgets, setEditingBudgets] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    categories.forEach((c) => {
      map[c.id] = c.budgetLimit || 0;
    });
    return map;
  });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('5000');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleBudgetChange = (catId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setEditingBudgets((prev) => ({
      ...prev,
      [catId]: Math.max(0, num),
    }));
  };

  const handleSaveAllBudgets = async () => {
    setIsSaving(true);
    try {
      for (const cat of categories) {
        const newLimit = editingBudgets[cat.id];
        if (newLimit !== undefined && newLimit !== cat.budgetLimit) {
          await onUpdateCategory(cat.id, { budgetLimit: newLimit });
        }
      }
      onClose();
    } catch (err) {
      console.error('Failed to save budgets', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await onAddCategory({
        name: newCatName.trim(),
        icon: newCatIcon,
        color: newCatColor,
        budgetLimit: parseFloat(newCatBudget) || 0,
      });
      setNewCatName('');
      setShowAddCategory(false);
    } catch (err) {
      console.error('Failed to add category', err);
    }
  };

  const totalCalculatedBudget = (Object.values(editingBudgets) as number[]).reduce<number>(
    (sum, v) => sum + (v || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Customizable Budget Limits (₹ INR)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total monthly limit preview banner */}
        <div className="px-5 py-3.5 bg-[#0B0F17] border-b border-[#222A3A] flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Monthly Budget Goal</span>
          <span className="text-base font-extrabold text-emerald-400">
            {formatINR(totalCalculatedBudget)}
          </span>
        </div>

        {/* Content list */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Category Monthly Spending Targets
            </span>
            <button
              type="button"
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Category</span>
            </button>
          </div>

          {/* Add custom category form accordion */}
          {showAddCategory && (
            <form
              onSubmit={handleCreateCategory}
              className="p-4 rounded-2xl bg-[#0B0F17] border border-indigo-500/40 space-y-3 animate-in fade-in"
            >
              <div className="text-xs font-bold text-white">Add New Category</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pet Care, Books, Travel..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Monthly Target Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="5000"
                    value={newCatBudget}
                    onChange={(e) => setNewCatBudget(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Color choices */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Badge Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      className={`w-6 h-6 rounded-full transition ${
                        newCatColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon selector */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Category Icon</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-[#161B26] rounded-xl border border-[#222A3A]">
                  {AVAILABLE_CATEGORY_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCatIcon(iconName)}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        newCatIcon === iconName
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-[#1E2533]'
                      }`}
                      title={iconName}
                    >
                      <CategoryIcon name={iconName} size={15} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/25"
                >
                  Create Category
                </button>
              </div>
            </form>
          )}

          {/* Categories budget limits table */}
          <div className="space-y-2">
            {categories.map((cat) => {
              const currentVal = editingBudgets[cat.id] ?? cat.budgetLimit;
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A] gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} size={15} />
                    </div>
                    <span className="text-xs font-semibold text-white truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={currentVal === 0 ? '' : currentVal}
                      placeholder="0"
                      onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                      className="w-28 px-2.5 py-1.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-right text-xs font-bold text-emerald-400 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#222A3A] bg-[#161B26] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-[#1E2533] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAllBudgets}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSaving ? 'Saving...' : 'Apply Budget Limits'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
