import {
  CheckCircle2,
  Flame,
  Pill,
  Heart,
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
import { Link } from 'react-router-dom';
import useDashboard from '../hooks/useDashboard.js';
import './Dashboard.css';

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

  const chartGridStroke = 'var(--color-border-light)';
  const chartAxisTick = { fontSize: 11, fill: 'var(--color-text-muted)' };
  const chartTooltipStyle = {
    backgroundColor: 'var(--color-bg-card)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-md)',
  };
  const chartTooltipLabelStyle = { color: 'var(--color-text-secondary)', fontWeight: 600 };
  const chartTooltipItemStyle = { color: 'var(--color-text-primary)' };
  const chartLegendStyle = { fontSize: 12, color: 'var(--color-text-secondary)' };

  return (
    <div className="dashboard-container">
      {/* Header & Period Selector */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>System Performance Dashboard</h1>
          <p>
            Aggregated intelligence across tasks, habit streaks, medical compliance, and well-being.
          </p>
        </div>

        <div className="dashboard-actions">
          <div className="period-select-wrapper">
            <Calendar size={16} color="var(--color-text-muted)" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="period-select"
              aria-label="Select analytics period"
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
            className="refresh-btn"
            title="Refresh analytics"
            aria-label="Refresh analytics"
          >
            <RefreshCw
              size={16}
              className={loading ? 'spinning' : ''}
              color={loading ? 'var(--color-primary-blue)' : 'currentColor'}
            />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="dashboard-error-banner">
          <span>{error}</span>
          <button onClick={refetch} className="retry-link">
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton or Content */}
      {loading && !data ? (
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : (
        <>
          {/* SECTION 1: OVERVIEW METRIC CARDS */}
          <div className="stats-grid">
            {/* 1. Tasks Card */}
            <div className="dashboard-stat-card">
              <div>
                <div className="stat-card-header">
                  <span className="stat-card-title">Tasks Overview</span>
                  <div className="stat-icon-wrapper icon-tasks">
                    <Link to={'/Tasks'}  style={{'text-decoration': 'none', 'color' : 'inherit'}}>
                    <CheckCircle2 size={18} style={{'margin-top': '5px'}}/>
                    </Link>
                  </div>
                </div>
                <div className="stat-card-value-group">
                  <span className="stat-card-value">
                    {overview?.tasks?.completionRate !== null && overview?.tasks?.completionRate !== undefined
                      ? `${Number(overview.tasks.completionRate).toFixed(0)}%`
                      : 'N/A'}
                  </span>
                  <span className="stat-card-label">Completion Rate</span>
                </div>
              </div>
              <div className="stat-card-footer">
                <span>Completed: <strong className="stat-highlight-green">{overview?.tasks?.completed ?? 0}</strong></span>
                <span>Pending: <strong>{overview?.tasks?.pending ?? 0}</strong></span>
                <span>Overdue: <strong className="stat-highlight-red">{overview?.tasks?.overdue ?? 0}</strong></span>
              </div>
            </div>

            {/* 2. Habits Card */}
            <div className="dashboard-stat-card">
              <div>
                <div className="stat-card-header">
                  <span className="stat-card-title">Habit Streaks</span>
                  <div className="stat-icon-wrapper icon-habits">
                    <Link to={'/Habits'} style={{'text-decoration': 'none', 'color' : 'inherit'}}>
                    <Flame size={18} style={{'margin-top': '5px'}}/>
                    </Link>
                  </div>
                </div>
                <div className="stat-card-value-group">
                  <span className="stat-card-value">
                    {overview?.habits?.averageCurrentStreak !== null && overview?.habits?.averageCurrentStreak !== undefined
                      ? `${Number(overview.habits.averageCurrentStreak).toFixed(1)}d`
                      : '0d'}
                  </span>
                  <span className="stat-card-label">Avg Current Streak</span>
                </div>
              </div>
              <div className="stat-card-footer">
                <span>Active: <strong>{overview?.habits?.totalHabits ?? 0}</strong></span>
                <span>Avg Best: <strong className="stat-highlight-amber">{Number(overview?.habits?.averageLongestStreak ?? 0).toFixed(1)}d</strong></span>
              </div>
            </div>

            {/* 3. Medicine Card */}
            <div className="dashboard-stat-card">
              <div>
                <div className="stat-card-header">
                  <span className="stat-card-title">Medicine Adherence</span>
                  <div className="stat-icon-wrapper icon-medicines">
                    <Link to={'/Medicine'} style={{'textDecoration' : 'none' , 'color' : 'inherit'}}>
                    <Pill size={18} style={{'marginTop' : '5px'}}/></Link>
                  </div>
                </div>
                <div className="stat-card-value-group">
                  <span className="stat-card-value">
                    {overview?.medicines?.adherenceRate !== null && overview?.medicines?.adherenceRate !== undefined
                      ? `${Number(overview.medicines.adherenceRate).toFixed(0)}%`
                      : 'N/A'}
                  </span>
                  <span className="stat-card-label">Compliance Rate</span>
                </div>
              </div>
              <div className="stat-card-footer">
                <span>Taken: <strong className="stat-highlight-green">{overview?.medicines?.takenDoses ?? 0}</strong></span>
                <span>Skipped: <strong className="stat-highlight-amber">{overview?.medicines?.skippedDoses ?? 0}</strong></span>
                <span>Missed: <strong className="stat-highlight-red">{overview?.medicines?.missedDoses ?? 0}</strong></span>
              </div>
            </div>

            {/* 4. Daily Well-being Card */}
            <div className="dashboard-stat-card">
              <div>
                <div className="stat-card-header">
                  <span className="stat-card-title">Daily Check-Ins</span>
                  <div className="stat-icon-wrapper icon-checkins">
                    <Link to={'/check-ins'} style={{'textDecoration' : 'none', 'color' : 'inherit'}}>
                    <Heart size={18} style={{'marginTop' : '5px'}}/></Link>
                  </div>
                </div>
                <div className="stat-card-value-group">
                  <span className="stat-card-value">
                    {overview?.dailyCheckIns?.averageMood !== null && overview?.dailyCheckIns?.averageMood !== undefined
                      ? `${Number(overview.dailyCheckIns.averageMood).toFixed(1)}/5`
                      : 'N/A'}
                  </span>
                  <span className="stat-card-label">Avg Mood Score</span>
                </div>
              </div>
              <div className="stat-card-footer">
                <span>Energy: <strong>{Number(overview?.dailyCheckIns?.averageEnergy ?? 0).toFixed(1)}/5</strong></span>
                <span>Productivity: <strong>{Number(overview?.dailyCheckIns?.averageProductivity ?? 0).toFixed(1)}/5</strong></span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CHARTS (Tasks Trend & Medicine Compliance) */}
          <div className="charts-grid-row">
            {/* Task Trend Chart */}
            <div className="dashboard-chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Task Completion Trend</h3>
                <p className="chart-card-subtitle">Scheduled due tasks vs completed per calendar date</p>
              </div>
              <div className="chart-canvas-wrapper">
                {charts?.taskTrend && charts.taskTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.taskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                      <XAxis dataKey="date" tick={chartAxisTick} tickLine={false} />
                      <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                      <Legend wrapperStyle={chartLegendStyle} />
                      <Bar dataKey="due" name="Due" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#1677FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty-state">
                    <CheckCircle2 size={32} />
                    <span>No task activity recorded in this period.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Medicine Compliance Trend Chart */}
            <div className="dashboard-chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Medicine Dose Trend</h3>
                <p className="chart-card-subtitle">Expected schedule vs taken doses</p>
              </div>
              <div className="chart-canvas-wrapper">
                {charts?.medicineTrend && charts.medicineTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.medicineTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                      <XAxis dataKey="date" tick={chartAxisTick} tickLine={false} />
                      <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                      <Legend wrapperStyle={chartLegendStyle} />
                      <Line type="monotone" dataKey="expected" name="Expected" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="taken" name="Taken" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="missed" name="Missed" stroke="#dc2626" strokeWidth={1.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty-state">
                    <Pill size={32} />
                    <span>No medicine doses scheduled in this period.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: CHARTS (Daily Check-In Trends & Mood Distribution) */}
          <div className="charts-grid-row">
            {/* Daily Check-In Trend Chart */}
            <div className="dashboard-chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Well-Being Trends</h3>
                <p className="chart-card-subtitle">Daily mood, energy, and productivity (1-5 scale)</p>
              </div>
              <div className="chart-canvas-wrapper">
                {charts?.dailyCheckInTrend && charts.dailyCheckInTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.dailyCheckInTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                      <XAxis dataKey="date" tick={chartAxisTick} tickLine={false} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={chartAxisTick} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                      <Legend wrapperStyle={chartLegendStyle} />
                      <Line type="monotone" dataKey="moodScore" name="Mood" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="energy" name="Energy" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#1677FF" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty-state">
                    <Smile size={32} />
                    <span>No check-ins submitted in this period.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="dashboard-chart-card">
              <div className="chart-card-header">
                <h3 className="chart-card-title">Mood Frequency Distribution</h3>
                <p className="chart-card-subtitle">Total occurrences by psychological state</p>
              </div>
              <div className="chart-canvas-wrapper">
                {moodDistributionData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moodDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                      <XAxis dataKey="mood" tick={chartAxisTick} tickLine={false} />
                      <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                      <Bar dataKey="count" name="Count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty-state">
                    <Heart size={32} />
                    <span>No mood records available for distribution.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: MEDICINE BREAKDOWN TABLE */}
          {details?.medicineBreakdown && details.medicineBreakdown.length > 0 && (
            <div className="dashboard-table-card">
              <h3 className="table-card-title">Medicine Compliance Breakdown</h3>
              <div className="table-responsive">
                <table className="dashboard-data-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Expected Doses</th>
                      <th>Taken Doses</th>
                      <th>Missed Doses</th>
                      <th>Adherence Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.medicineBreakdown.map((item) => (
                      <tr key={item.medicineId}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>{item.expectedDoses}</td>
                        <td className="stat-highlight-green">{item.takenDoses}</td>
                        <td className="stat-highlight-red">{item.missedDoses}</td>
                        <td style={{ fontWeight: 700 }}>{Number(item.adherenceRate).toFixed(0)}%</td>
                        <td>
                          <span
                            className={`status-badge ${
                              item.status === 'active' ? 'status-active' : 'status-inactive'
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
