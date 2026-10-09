import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to format errors and handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.messgae || // handle backend typo in authMiddleware catch
      error.message ||
      'An unexpected error occurred';
    
    // Attach clean message to error
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export default api;
