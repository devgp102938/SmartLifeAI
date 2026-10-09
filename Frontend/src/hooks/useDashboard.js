import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboardService.js';

export const useDashboard = (initialPeriod = 'last7days') => {
  const [period, setPeriod] = useState(initialPeriod);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await dashboardService.getDashboard({
        period,
        customStart: period === 'custom' ? customRange.start : undefined,
        customEnd: period === 'custom' ? customRange.end : undefined,
      });
      setData(dashboard);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  }, [period, customRange.start, customRange.end]);

  useEffect(() => {
    if (period === 'custom' && (!customRange.start || !customRange.end)) {
      return; // wait until both dates are selected
    }
    fetchDashboard();
  }, [fetchDashboard, period]);

  return {
    data,
    loading,
    error,
    period,
    setPeriod,
    customRange,
    setCustomRange,
    refetch: fetchDashboard,
  };
};

export default useDashboard;
