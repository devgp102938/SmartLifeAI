import api from '../api/client.js';

export const medicineService = {
  async getMedicines() {
    const res = await api.get('/api/medicine');
    return res.data?.medicine || [];
  },

  async getMedicineById(id) {
    const res = await api.get(`/api/medicine/${id}`);
    return res.data?.medicine;
  },

  async createMedicine(data) {
    const res = await api.post('/api/medicine', data);
    return res.data;
  },

  async updateMedicine(id, data) {
    const res = await api.put(`/api/medicine/${id}`, data);
    return res.data;
  },

  async deleteMedicine(id) {
    const res = await api.delete(`/api/medicine/${id}`);
    return res.data;
  },

  async takeDose(id, { scheduledDate, scheduledTime }) {
    const res = await api.patch(`/api/medicine/${id}/taken`, {
      scheduledDate,
      scheduledTime,
    });
    return res.data;
  },

  async skipDose(id, { scheduledDate, scheduledTime }) {
    const res = await api.patch(`/api/medicine/${id}/skipped`, {
      scheduledDate,
      scheduledTime,
    });
    return res.data;
  },

  async undoDose(id, { scheduledDate, scheduledTime }) {
    const res = await api.delete(`/api/medicine/${id}/undo`, {
      data: {
        scheduledDate,
        scheduledTime,
      },
    });
    return res.data;
  },
};

export default medicineService;
