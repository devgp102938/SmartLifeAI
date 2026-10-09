import api from '../api/client.js';

export const habitService = {
  async getHabits() {
    try {
      const res = await api.get('/api/habits');
      return res.data?.habits || [];
    } catch (err) {
      if (err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  async getHabitById(id) {
    const res = await api.get(`/api/habits/${id}`);
    return res.data?.habit;
  },

  async createHabit(data) {
    const res = await api.post('/api/habits', data);
    return res.data?.habit;
  },

  async updateHabit(id, data) {
    const res = await api.put(`/api/habits/${id}`, data);
    return res.data?.habit;
  },

  async deleteHabit(id) {
    const res = await api.delete(`/api/habits/${id}`);
    return res.data;
  },

  async completeHabit(id) {
    const res = await api.patch(`/api/habits/${id}/complete`);
    return res.data;
  },

  async uncompleteHabit(id) {
    const res = await api.patch(`/api/habits/${id}/uncomplete`);
    return res.data;
  },
};

export default habitService;
