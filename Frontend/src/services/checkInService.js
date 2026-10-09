import api from '../api/client.js';

export const checkInService = {
  async getCheckIns({ page = 1, limit = 10 } = {}) {
    try {
      const res = await api.get('/api/check-ins', { params: { page, limit } });
      return {
        checkIns: res.data?.checkIns || [],
        pagination: res.data?.pagination || { page: 1, totalCheckIns: 0, totalPages: 1 },
      };
    } catch (err) {
      if (err.response?.status === 404) {
        return {
          checkIns: [],
          pagination: { page: 1, totalCheckIns: 0, totalPages: 1 },
        };
      }
      throw err;
    }
  },

  async getCheckInByDate(date) {
    try {
      const res = await api.get(`/api/check-ins/date/${date}`);
      return res.data?.checkIn;
    } catch (err) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async createCheckIn(data) {
    const res = await api.post('/api/check-ins', data);
    return res.data?.checkIn;
  },

  async updateCheckIn(date, data) {
    const res = await api.put(`/api/check-ins/date/${date}`, data);
    return res.data?.checkIn;
  },

  async deleteCheckIn(date) {
    const res = await api.delete(`/api/check-ins/date/${date}`);
    return res.data;
  },
};

export default checkInService;
