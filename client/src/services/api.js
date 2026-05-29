import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const employeeAPI = {
  register: (formData) => api.post('/employees/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const faceAPI = {
  verify: (descriptor) => api.post('/face/verify', { descriptor }),
};

export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark', data),
  getToday: () => api.get('/attendance/today'),
  getAll: (params) => api.get('/attendance/all', { params }),
  getDashboard: () => api.get('/attendance/dashboard'),
};

export default api;
