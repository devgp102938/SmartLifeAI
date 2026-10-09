import api from '../api/client.js';

export const dashboardService = {
  async getDashboard({ period = 'last7days', timezone, customStart, customEnd } = {}) {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const params = {
      period,
      timezone: tz,
    };
    if (customStart) params.customStart = customStart;
    if (customEnd) params.customEnd = customEnd;

    const res = await api.get('/api/dashboard', { params });
    return res.data?.dashboard;
  },
};

export default dashboardService;
