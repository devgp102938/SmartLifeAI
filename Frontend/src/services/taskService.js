import api from '../api/client.js';

export const taskService = {
  async getTasks() {
    try {
      const res = await api.get('/api/tasks');
      return res.data?.tasks || [];
    } catch (err) {
      if (err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  async getTaskById(id) {
    const res = await api.get(`/api/tasks/${id}`);
    return res.data?.task;
  },

  async createTask(data) {
    const res = await api.post('/api/tasks', data);
    return res.data?.task;
  },

  async updateTask(id, data) {
    const res = await api.put(`/api/tasks/${id}`, data);
    return res.data?.task;
  },

  async deleteTask(id) {
    const res = await api.delete(`/api/tasks/${id}`);
    return res.data;
  },

  async completeTask(id) {
    const res = await api.patch(`/api/tasks/${id}/complete`);
    return res.data?.task;
  },

  async uncompleteTask(id) {
    const res = await api.patch(`/api/tasks/${id}/uncomplete`);
    return res.data?.task;
  },
};

export default taskService;
