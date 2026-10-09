import api from '../api/client.js';

export const aiService = {
  async getOrionAdvice(prompt) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const res = await api.post('/api/ai/chat', {
      prompt,
      timezone,
    });
    return res.data?.reply;
  },
};

export default aiService;
