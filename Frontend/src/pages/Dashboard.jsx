import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Pill,
  Heart,
  Zap,
  TrendingUp,
  RefreshCw,
  Calendar,
  Smile,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import useDashboard from '../hooks/useDashboard.js';

const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last 90 Days', value: 'last90days' },
  { label: 'Today', value: 'today' },
];

export const Dashboard = () => {
  const { data, loading, error, period, setPeriod, refetch } = useDashboard('last7days');

  const overview = data?.overview;
  const charts = data?.charts;
  const details = data?.details;

  // Transform mood distribution object into array for Recharts
  const moodDistributionData = charts?.moodDistribution
    ? Object.entries(charts.moodDistribution).map(([mood, count]) => ({
        mood: mood.charAt(0).toUpperCase() + mood.slice(1),
        count,
      }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Performance Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated intelligence across tasks, habit streaks, medical compliance, and well-being.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium text-sm focus:outline-none cursor-pointer"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 shadow-sm transition-colors cursor-pointer"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={refetch}
            className="text-xs font-semibold underline hover:no-underline ml-4"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton or Content */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 p-5 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* SECTION 1: OVERVIEW METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Tasks Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tasks Overview
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {overview?.tasks?.completionRate !== null && overview?.tasks?.completionRate !== undefined
                    ? `${Number(overview.tasks.completionRate).toFixed(0)}%`
                    : 'N/A'}
                </span>
                <span className="text-xs text-slate-500 font-medium">Completion Rate</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Completed: <strong className="text-emerald-600">{overview?.tasks?.completed ?? 0}</strong></span>
                <span>Pending: <strong className="text-slate-800">{overview?.tasks?.pending ?? 0}</strong></span>
                <span>Overdue: <strong className="text-rose-600">{overview?.tasks?.overdue ?? 0}</strong></span>
              </div>
            </div>

            {/* 2. Habits Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Habit Streaks
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {overview?.habits?.averageCurrentStreak !== null && overview?.habits?.averageCurrentStreak !== undefined
                    ? `${Number(overview.habits.averageCurrentStreak).toFixed(1)}d`
                    : '0d'}
                </span>
                <span className="text-xs text-slate-500 font-medium">Avg Current Streak</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Active: <strong>{overview?.habits?.totalHabits ?? 0}</strong></span>
                <span>Avg Best: <strong className="text-amber-600">{Number(overview?.habits?.averageLongestStreak ?? 0).toFixed(1)}d</strong></span>
              </div>
            </div>

            {/* 3. Medicine Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Medicine Adherence
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Pill className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {overview?.medicines?.adherenceRate !== null && overview?.medicines?.adherenceRate !== undefined
                    ? `${Number(overview.medicines.adherenceRate).toFixed(0)}%`
                    : 'N/A'}
                </span>
                <span className="text-xs text-slate-500 font-medium">Compliance Rate</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Taken: <strong className="text-emerald-600">{overview?.medicines?.takenDoses ?? 0}</strong></span>
                <span>Skipped: <strong className="text-amber-600">{overview?.medicines?.skippedDoses ?? 0}</strong></span>
                <span>Missed: <strong className="text-rose-600">{overview?.medicines?.missedDoses ?? 0}</strong></span>
              </div>
            </div>

            {/* 4. Daily Well-being Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily Check-Ins
                </span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Heart className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {overview?.dailyCheckIns?.averageMood !== null && overview?.dailyCheckIns?.averageMood !== undefined
                    ? `${Number(overview.dailyCheckIns.averageMood).toFixed(1)}/5`
                    : 'N/A'}
                </span>
                <span className="text-xs text-slate-500 font-medium">Avg Mood Score</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Energy: <strong>{Number(overview?.dailyCheckIns?.averageEnergy ?? 0).toFixed(1)}/5</strong></span>
                <span>Productivity: <strong>{Number(overview?.dailyCheckIns?.averageProductivity ?? 0).toFixed(1)}/5</strong></span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CHARTS (Tasks Trend & Medicine Compliance) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Task Completion Trend</h3>
                  <p className="text-xs text-slate-400">Scheduled due tasks vs completed per calendar date</p>
                </div>
              </div>
              <div className="h-64 w-full">
                {charts?.taskTrend && charts.taskTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.taskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="due" name="Due" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No task activity recorded in this period.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Medicine Compliance Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Medicine Dose Trend</h3>
                  <p className="text-xs text-slate-400">Expected schedule vs taken doses</p>
                </div>
              </div>
              <div className="h-64 w-full">
                {charts?.medicineTrend && charts.medicineTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.medicineTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="expected" name="Expected" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="taken" name="Taken" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="missed" name="Missed" stroke="#f43f5e" strokeWidth={1.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <Pill className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No medicine doses scheduled in this period.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: CHARTS (Daily Check-In Trends & Mood Distribution) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Check-In Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Well-Being Trends</h3>
                  <p className="text-xs text-slate-400">Daily mood, energy, and productivity (1-5 scale)</p>
                </div>
              </div>
              <div className="h-64 w-full">
                {charts?.dailyCheckInTrend && charts.dailyCheckInTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.dailyCheckInTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="moodScore" name="Mood" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="energy" name="Energy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <Smile className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No check-ins submitted in this period.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mood Frequency Distribution</h3>
                  <p className="text-xs text-slate-400">Total occurrences by psychological state</p>
                </div>
              </div>
              <div className="h-64 w-full">
                {moodDistributionData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moodDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="mood" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="count" name="Count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                    <Heart className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No mood records available for distribution.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: MEDICINE BREAKDOWN TABLE */}
          {details?.medicineBreakdown && details.medicineBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">Medicine Compliance Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Medicine</th>
                      <th className="py-3 px-4">Expected Doses</th>
                      <th className="py-3 px-4">Taken Doses</th>
                      <th className="py-3 px-4">Missed Doses</th>
                      <th className="py-3 px-4">Adherence Rate</th>
                      <th className="py-3 px-4 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {details.medicineBreakdown.map((item) => (
                      <tr key={item.medicineId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 px-4 text-slate-600">{item.expectedDoses}</td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">{item.takenDoses}</td>
                        <td className="py-3 px-4 text-rose-600 font-semibold">{item.missedDoses}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{Number(item.adherenceRate).toFixed(0)}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                              item.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
