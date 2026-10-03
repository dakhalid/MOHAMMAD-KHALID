import React, { useState } from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  BarChart3,
  Sliders,
  Target,
  Repeat,
  ArrowRight,
} from 'lucide-react';
import { Category, Expense, RecurringExpense } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatINR } from '../utils/formatCurrency';

interface MonthlyInsightsProps {
  categories: Category[];
  expenses: Expense[];
  recurringExpenses?: RecurringExpense[];
  selectedMonth: string; // YYYY-MM
  onSelectMonth: (month: string) => void;
  onOpenBudgetManager: () => void;
  onOpenRecurringModal?: () => void;
  onSelectCategoryFilter?: (categoryId: string) => void;
}

export const MonthlyInsights: React.FC<MonthlyInsightsProps> = ({
  categories,
  expenses,
  recurringExpenses = [],
  selectedMonth,
  onSelectMonth,
  onOpenBudgetManager,
  onOpenRecurringModal,
  onSelectCategoryFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'daily'>('overview');

  // Parse current selected month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed
  const monthDate = new Date(year, monthIndex, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Month navigation
  const handlePrevMonth = () => {
    const prev = new Date(year, monthIndex - 1, 1);
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    onSelectMonth(`${prev.getFullYear()}-${m}`);
  };

  const handleNextMonth = () => {
    const next = new Date(year, monthIndex + 1, 1);
    const m = String(next.getMonth() + 1).padStart(2, '0');
    onSelectMonth(`${next.getFullYear()}-${m}`);
  };

  // Filter expenses for selected month
  const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));

  // Recurring expenses calculation
  const activeRecurring = recurringExpenses.filter((r) => r.isActive);
  const totalRecurringCommitment = activeRecurring.reduce((sum, r) => sum + r.amount, 0);
  const recurringLoggedCount = monthExpenses.filter((e) => e.tags?.includes('recurring')).length;

  // Days in month
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
  const daysElapsed = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  // Totals in INR
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBudget = categories.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
  const remainingBudget = totalBudget - totalSpent;
  const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Daily calculations & projection
  const dailyAverage = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const projectedSpend = totalSpent + dailyAverage * daysRemaining;

  // Category spending breakdown
  const categorySpending = categories
    .map((cat) => {
      const catExpenses = monthExpenses.filter((e) => e.categoryId === cat.id);
      const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
      const budget = cat.budgetLimit || 0;
      const pct = budget > 0 ? (spent / budget) * 100 : 0;
      return {
        category: cat,
        spent,
        budget,
        percentage: pct,
        count: catExpenses.length,
        isOverBudget: budget > 0 && spent > budget,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  // Top spending category
  const topCategory = categorySpending.find((c) => c.spent > 0);

  // Daily spending map for chart
  const dailySpendMap: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailySpendMap[d] = 0;
  }
  monthExpenses.forEach((e) => {
    const day = parseInt(e.date.split('-')[2], 10);
    if (day && dailySpendMap[day] !== undefined) {
      dailySpendMap[day] += e.amount;
    }
  });

  const maxDailySpend = Math.max(1, ...Object.values(dailySpendMap));

  return (
    <section className="space-y-4">
      {/* Month Navigator & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161B26] border border-[#222A3A] rounded-2xl p-4 shadow-xl shadow-black/40">
        {/* Month Picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-300 hover:text-white transition"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white tracking-tight">{monthName}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-300 hover:text-white transition"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {isCurrentMonth && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              Current
            </span>
          )}
        </div>

        {/* View Switcher, Recurring & Budget Settings */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-[#0B0F17] p-1 border border-[#222A3A]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === 'categories'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                activeTab === 'daily'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Daily Trend
            </button>
          </div>

          {/* Recurring costs shortcut */}
          {onOpenRecurringModal && (
            <button
              onClick={onOpenRecurringModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-200 border border-[#222A3A] text-xs font-semibold transition active:scale-95"
              title="Manage Recurring Subscriptions & Rent"
            >
              <Repeat className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xs:inline">Recurring</span>
            </button>
          )}

          {/* Customize Budget limits */}
          <button
            onClick={onOpenBudgetManager}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-200 border border-[#222A3A] text-xs font-semibold transition active:scale-95"
            title="Customize Budget Limits"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">Budgets</span>
          </button>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Spent */}
        <div className="p-4 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
            <span>Money Spent</span>
            <span className="text-[11px] font-mono text-slate-400">
              {monthExpenses.length} {monthExpenses.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatINR(totalSpent)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Avg {formatINR(dailyAverage)}/day</span>
            {recurringLoggedCount > 0 && (
              <span className="text-[10px] text-indigo-400 font-medium">
                {recurringLoggedCount} fixed costs
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Budget */}
        <div className="p-4 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
            <span>Pocket Money / Budget</span>
            <button
              onClick={onOpenBudgetManager}
              className="text-indigo-400 hover:underline text-[11px] font-semibold"
            >
              Change
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-200 tracking-tight">
            {formatINR(totalBudget)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Your monthly limit</span>
          </div>
        </div>

        {/* Card 3: Remaining / Over-Budget */}
        <div
          className={`p-4 rounded-2xl border shadow-xl shadow-black/30 relative overflow-hidden ${
            remainingBudget < 0
              ? 'bg-rose-950/30 border-rose-900/60'
              : remainingBudget < totalBudget * 0.15
              ? 'bg-amber-950/30 border-amber-900/60'
              : 'bg-[#161B26] border-[#222A3A]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
            <span>{remainingBudget >= 0 ? 'Money Left (Saved)' : 'Over Budget By'}</span>
            {remainingBudget >= 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              remainingBudget < 0
                ? 'text-rose-400'
                : remainingBudget < totalBudget * 0.15
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {formatINR(Math.abs(remainingBudget))}
          </div>
          <div className="mt-2 text-xs">
            {remainingBudget >= 0 ? (
              <span className="text-emerald-400 font-medium">😊 Looking good! Balance remaining</span>
            ) : (
              <span className="text-rose-400 font-medium">⚠️ Spent over your target limit</span>
            )}
          </div>
        </div>

        {/* Card 4: Forecast / Projected Spend */}
        <div className="p-4 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
            <span>Expected by Month-End</span>
            <Target className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              projectedSpend > totalBudget && totalBudget > 0 ? 'text-amber-300' : 'text-slate-100'
            }`}
          >
            {formatINR(projectedSpend)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span>{daysRemaining} days left in this month</span>
          </div>
        </div>
      </div>

      {/* Recurring Fixed Commitment Bar */}
      {totalRecurringCommitment > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Monthly Fixed Costs: {formatINR(totalRecurringCommitment)}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({activeRecurring.length} recurring items)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {recurringLoggedCount} of {activeRecurring.length} auto-logged for {monthName}
              </span>
            </div>
          </div>

          {onOpenRecurringModal && (
            <button
              onClick={onOpenRecurringModal}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 self-start sm:self-auto"
            >
              <span>Manage Recurring Costs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Overall Budget Progress Bar */}
      {totalBudget > 0 && (
        <div className="p-4 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Overall Budget Utilization</span>
            <span
              className={
                percentageUsed > 100
                  ? 'text-rose-400'
                  : percentageUsed > 80
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }
            >
              {percentageUsed.toFixed(1)}% ({formatINR(totalSpent)} / {formatINR(totalBudget)})
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#0B0F17] overflow-hidden border border-[#222A3A]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentageUsed > 100
                  ? 'bg-rose-500'
                  : percentageUsed > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, percentageUsed)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tab: Overview (Visual Charts & Highlights) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visual Donut / Segmented Spending Breakdown */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-400" />
                Spending by Category
              </h3>
              <span className="text-xs text-slate-400">
                {categorySpending.filter((c) => c.spent > 0).length} active categories
              </span>
            </div>

            {categorySpending.filter((c) => c.spent > 0).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No expense entries recorded for {monthName}.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Horizontal Segmented Bar */}
                <div className="h-4 w-full rounded-full bg-[#0B0F17] overflow-hidden flex border border-[#222A3A]">
                  {categorySpending
                    .filter((c) => c.spent > 0)
                    .map((item) => {
                      const share = totalSpent > 0 ? (item.spent / totalSpent) * 100 : 0;
                      return (
                        <div
                          key={item.category.id}
                          className="h-full transition-all duration-300 hover:opacity-80"
                          style={{
                            width: `${share}%`,
                            backgroundColor: item.category.color,
                          }}
                          title={`${item.category.name}: ${formatINR(item.spent)} (${share.toFixed(1)}%)`}
                        />
                      );
                    })}
                </div>

                {/* Category mini-cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {categorySpending
                    .filter((c) => c.spent > 0)
                    .slice(0, 6)
                    .map((item) => {
                      const share = totalSpent > 0 ? (item.spent / totalSpent) * 100 : 0;
                      return (
                        <div
                          key={item.category.id}
                          onClick={() => onSelectCategoryFilter && onSelectCategoryFilter(item.category.id)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0F17] border border-[#222A3A] hover:border-[#2E3A4E] cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${item.category.color}25`, color: item.category.color }}
                            >
                              <CategoryIcon name={item.category.icon} size={15} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-200 block truncate">
                                {item.category.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {share.toFixed(1)}% of total
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-white block">
                              {formatINR(item.spent)}
                            </span>
                            {item.budget > 0 && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  item.isOverBudget ? 'text-rose-400' : 'text-slate-400'
                                }`}
                              >
                                {item.isOverBudget ? 'Over limit!' : `Limit ${formatINR(item.budget, { showDecimals: false })}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Insights Highlights Sidebar */}
          <div className="p-5 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 space-y-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Monthly Highlights
            </h3>

            <div className="space-y-2.5 text-xs">
              {/* Top Category */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Top Spending Area
                </span>
                {topCategory && topCategory.spent > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{
                          backgroundColor: `${topCategory.category.color}25`,
                          color: topCategory.category.color,
                        }}
                      >
                        <CategoryIcon name={topCategory.category.icon} size={14} />
                      </div>
                      <span className="font-semibold text-white">{topCategory.category.name}</span>
                    </div>
                    <span className="font-bold text-emerald-400">
                      {formatINR(topCategory.spent)}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">None yet</span>
                )}
              </div>

              {/* Daily Pace */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Average Daily Spend
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Current Pace</span>
                  <span className="font-bold text-white">
                    {formatINR(dailyAverage)} / day
                  </span>
                </div>
              </div>

              {/* Budget Health status */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Budget Discipline
                </span>
                <div className="flex items-center gap-2">
                  {percentageUsed > 100 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="text-rose-300 font-medium">Over monthly threshold</span>
                    </>
                  ) : percentageUsed > 80 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-300 font-medium">Approaching monthly limit</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 font-medium">Healthy spending pace</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Categories (Detailed Per-Category Budget Progress) */}
      {activeTab === 'categories' && (
        <div className="p-5 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Category Budgets & Spending (₹ INR)</h3>
            <button
              onClick={onOpenBudgetManager}
              className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              Customize Limits
            </button>
          </div>

          <div className="space-y-3">
            {categorySpending.map((item) => {
              const hasBudget = item.budget > 0;
              return (
                <div
                  key={item.category.id}
                  className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#222A3A] hover:border-[#2E3A4E] transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.category.color}25`, color: item.category.color }}
                      >
                        <CategoryIcon name={item.category.icon} size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{item.category.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-white">
                        {formatINR(item.spent)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {hasBudget ? (
                          <span
                            className={
                              item.isOverBudget
                                ? 'text-rose-400 font-bold'
                                : item.percentage > 80
                                ? 'text-amber-400 font-medium'
                                : 'text-slate-400'
                            }
                          >
                            Limit: {formatINR(item.budget, { showDecimals: false })} ({item.percentage.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">No limit set</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {hasBudget && (
                    <div className="w-full h-2 rounded-full bg-[#161B26] overflow-hidden border border-[#222A3A]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.isOverBudget
                            ? 'bg-rose-500'
                            : item.percentage > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Daily Spending Trend */}
      {activeTab === 'daily' && (
        <div className="p-5 rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-xl shadow-black/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Daily Spending Histogram ({monthName})
            </h3>
            <span className="text-xs text-slate-400">
              Peak Day: {formatINR(maxDailySpend)}
            </span>
          </div>

          <div className="pt-6 pb-2">
            <div className="h-44 flex items-end gap-1 sm:gap-1.5 w-full">
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const spend = dailySpendMap[day] || 0;
                const heightPercent = maxDailySpend > 0 ? (spend / maxDailySpend) * 100 : 0;
                const isToday = isCurrentMonth && day === today.getDate();

                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 hidden group-hover:flex px-2 py-1 bg-[#0B0F17] border border-[#222A3A] text-[10px] text-white rounded-lg font-mono z-20 whitespace-nowrap shadow-xl">
                      Day {day}: {formatINR(spend)}
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        spend > 0
                          ? isToday
                            ? 'bg-emerald-400'
                            : 'bg-indigo-600 hover:bg-indigo-500'
                          : 'bg-[#1E2533]/50'
                      }`}
                      style={{ height: `${Math.max(spend > 0 ? 8 : 2, heightPercent)}%` }}
                    />
                    <span
                      className={`text-[9px] font-mono leading-none ${
                        isToday ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {day % 5 === 0 || day === 1 || day === daysInMonth ? day : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
