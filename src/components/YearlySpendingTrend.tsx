import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Layers,
} from 'lucide-react';
import { Category, Expense } from '../types';
import { formatCompactINR, formatINR } from '../utils/formatCurrency';

interface YearlySpendingTrendProps {
  expenses: Expense[];
  categories: Category[];
  selectedMonth?: string;
  onSelectMonth?: (monthKey: string) => void;
}

interface MonthDataPoint {
  month: string;
  fullName: string;
  monthKey: string;
  spent: number;
  budget: number;
  txCount: number;
  isCurrentMonth: boolean;
  isFuture: boolean;
  isPastOrCurrent: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: MonthDataPoint;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const hasBudget = data.budget > 0;
  const diff = data.budget - data.spent;
  const isOver = data.spent > data.budget;

  return (
    <div className="rounded-xl bg-[#0B0F17] border border-[#222A3A] p-3 shadow-2xl text-xs space-y-1.5 min-w-[190px]">
      <div className="flex items-center justify-between border-b border-[#222A3A] pb-1.5">
        <span className="font-bold text-white flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          {data.fullName}
        </span>
        {data.isCurrentMonth && (
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            Current
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between pt-0.5">
        <span className="text-slate-400 text-[11px]">Total Spending:</span>
        <span className="text-sm font-extrabold text-white">
          {formatINR(data.spent)}
        </span>
      </div>

      {hasBudget && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Monthly Budget:</span>
          <span className="font-semibold text-slate-300">
            {formatINR(data.budget, { showDecimals: false })}
          </span>
        </div>
      )}

      {hasBudget && data.isPastOrCurrent && data.spent > 0 && (
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1E2533]">
          <span className="text-slate-400">Budget Status:</span>
          <span
            className={`font-semibold flex items-center gap-1 ${
              isOver ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {isOver ? (
              <>
                <ArrowUpRight className="w-3 h-3" />
                Over by {formatINR(Math.abs(diff))}
              </>
            ) : (
              <>
                <ArrowDownRight className="w-3 h-3" />
                Under by {formatINR(diff)}
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
        <span>Transactions:</span>
        <span className="font-mono text-slate-300">
          {data.txCount} {data.txCount === 1 ? 'entry' : 'entries'}
        </span>
      </div>
    </div>
  );
};

export const YearlySpendingTrend: React.FC<YearlySpendingTrendProps> = ({
  expenses,
  categories,
  selectedMonth,
  onSelectMonth,
}) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [viewYear, setViewYear] = useState<number>(currentYear);
  const [showBudgetLine, setShowBudgetLine] = useState<boolean>(true);

  // Total monthly category budget limit
  const totalMonthlyBudget = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
  }, [categories]);

  // Generate 12 months data for viewYear
  const yearlyData = useMemo<MonthDataPoint[]>(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    return months.map((abbr, index) => {
      const monthNumStr = String(index + 1).padStart(2, '0');
      const monthKey = `${viewYear}-${monthNumStr}`;
      const d = new Date(viewYear, index, 1);
      const fullName = d.toLocaleString('default', { month: 'long', year: 'numeric' });

      const monthExpenses = expenses.filter((e) => e.date.startsWith(monthKey));
      const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      const isCurrentMonth = viewYear === today.getFullYear() && index === today.getMonth();
      const isFuture = viewYear === today.getFullYear() && index > today.getMonth();
      const isPastOrCurrent = !isFuture;

      return {
        month: abbr,
        fullName,
        monthKey,
        spent,
        budget: totalMonthlyBudget,
        txCount: monthExpenses.length,
        isCurrentMonth,
        isFuture,
        isPastOrCurrent,
      };
    });
  }, [expenses, viewYear, totalMonthlyBudget, today]);

  // Metrics for the year
  const elapsedMonths = yearlyData.filter((m) => m.isPastOrCurrent);
  const totalYearSpend = elapsedMonths.reduce((sum, m) => sum + m.spent, 0);
  const averageMonthlySpend = elapsedMonths.length > 0 ? totalYearSpend / elapsedMonths.length : 0;

  const monthsWithSpend = elapsedMonths.filter((m) => m.spent > 0);
  const highestSpendMonth = monthsWithSpend.length > 0
    ? [...monthsWithSpend].sort((a, b) => b.spent - a.spent)[0]
    : null;
  const lowestSpendMonth = monthsWithSpend.length > 0
    ? [...monthsWithSpend].sort((a, b) => a.spent - b.spent)[0]
    : null;

  const maxSpentVal = Math.max(
    1000,
    totalMonthlyBudget,
    ...yearlyData.map((d) => d.spent)
  );

  return (
    <section
      id="annual-spending-trend-card"
      className="p-5 rounded-2xl sm:rounded-3xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/40 space-y-4 relative overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Annual Spending Trend
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0B0F17] border border-[#222A3A] text-indigo-300 font-mono">
                  {viewYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Monthly expenditure progression & budget target comparison across {viewYear}
              </p>
            </div>
          </div>
        </div>

        {/* Year switch & Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Year selector */}
          <div className="flex items-center gap-1 rounded-xl bg-[#0B0F17] border border-[#222A3A] p-1">
            <button
              type="button"
              onClick={() => setViewYear(viewYear - 1)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
              title="Previous Year"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-200 px-1.5 font-mono">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear(viewYear + 1)}
              disabled={viewYear >= currentYear}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2533] disabled:opacity-30 disabled:pointer-events-none transition"
              title="Next Year"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Budget Target Line */}
          <button
            type="button"
            onClick={() => setShowBudgetLine(!showBudgetLine)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
              showBudgetLine
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                : 'bg-[#0B0F17] text-slate-400 border-[#222A3A] hover:text-slate-200'
            }`}
            title="Toggle Monthly Budget Target Reference Line"
          >
            {showBudgetLine ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">Budget Target</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 relative z-10">
        {/* Total YTD */}
        <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Total {viewYear} Spent
          </span>
          <span className="text-base sm:text-lg font-extrabold text-white tracking-tight block">
            {formatINR(totalYearSpend)}
          </span>
          <span className="text-[10px] text-slate-400">
            Across {elapsedMonths.length} active months
          </span>
        </div>

        {/* Monthly Average */}
        <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Monthly Average
          </span>
          <span className="text-base sm:text-lg font-extrabold text-indigo-300 tracking-tight block">
            {formatINR(averageMonthlySpend)}
          </span>
          <span className="text-[10px] text-slate-400">
            Average monthly burn rate
          </span>
        </div>

        {/* Peak Month */}
        <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Peak Spending Month
          </span>
          <span className="text-base sm:text-lg font-extrabold text-amber-300 tracking-tight block truncate">
            {highestSpendMonth ? formatINR(highestSpendMonth.spent) : '—'}
          </span>
          <span className="text-[10px] text-slate-400 truncate block">
            {highestSpendMonth ? highestSpendMonth.fullName : 'No data yet'}
          </span>
        </div>

        {/* Target Limit */}
        <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Monthly Target Limit
          </span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-400 tracking-tight block">
            {formatINR(totalMonthlyBudget, { showDecimals: false })}
          </span>
          <span className="text-[10px] text-slate-400">
            All categories combined
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="w-full pt-4 pb-1 relative z-10">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={yearlyData}
              margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
              onClick={(state: unknown) => {
                const chartState = state as { activePayload?: Array<{ payload: MonthDataPoint }> } | null;
                if (chartState?.activePayload && chartState.activePayload.length > 0) {
                  const clicked = chartState.activePayload[0].payload;
                  if (clicked?.monthKey && onSelectMonth) {
                    onSelectMonth(clicked.monthKey);
                  }
                }
              }}
            >
              <defs>
                <linearGradient id="spendingLineGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E2533"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#222A3A' }}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const item = yearlyData.find((d) => d.month === payload.value);
                  const isSelected = selectedMonth === item?.monthKey;
                  const isCur = item?.isCurrentMonth;

                  return (
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      fill={isSelected ? '#818cf8' : isCur ? '#34d399' : '#94a3b8'}
                      fontWeight={isSelected || isCur ? 'bold' : 'normal'}
                      fontSize={11}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />

              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, Math.ceil(maxSpentVal * 1.15)]}
                tickFormatter={(val: number) => formatCompactINR(val)}
                width={55}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              {/* Monthly Budget Target Reference Line */}
              {showBudgetLine && totalMonthlyBudget > 0 && (
                <ReferenceLine
                  y={totalMonthlyBudget}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: `Budget Target: ${formatCompactINR(totalMonthlyBudget)}`,
                    fill: '#34d399',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}

              {/* Monthly Spending Line */}
              <Line
                type="monotone"
                dataKey="spent"
                name="Monthly Spending"
                stroke="url(#spendingLineGlow)"
                strokeWidth={3}
                dot={(dotProps) => {
                  const { cx, cy, payload } = dotProps;
                  if (!cx || !cy) return null;
                  const isSelected = selectedMonth === payload.monthKey;
                  const isCur = payload.isCurrentMonth;
                  const hasSpent = payload.spent > 0;

                  return (
                    <circle
                      key={`dot-${payload.monthKey}`}
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : isCur ? 5 : hasSpent ? 4 : 2}
                      fill={isSelected ? '#818cf8' : isCur ? '#34d399' : hasSpent ? '#6366f1' : '#334155'}
                      stroke="#0B0F17"
                      strokeWidth={2}
                      className="cursor-pointer transition-all duration-200 hover:scale-125"
                    />
                  );
                }}
                activeDot={{
                  r: 7,
                  fill: '#818cf8',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart Legend & Quick Month Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222A3A] text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
            <span className="text-slate-300">Actual Monthly Spend</span>
          </div>
          {showBudgetLine && totalMonthlyBudget > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-emerald-400" />
              <span className="text-emerald-400">Budget Limit</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-400">
          💡 Click any point on the chart to inspect that month's details below
        </div>
      </div>
    </section>
  );
};
