import api from '../api/client.js';

export const authService = {
  async signup(data) {
    const res = await api.post('/api/auth/signup', data);
    return res.data;
  },

  async login(data) {
    const res = await api.post('/api/auth/login', data);
    return res.data;
  },

  async logout() {
    const res = await api.post('/api/auth/logout');
    return res.data;
  },

  async getMe() {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
};

export default authService;
