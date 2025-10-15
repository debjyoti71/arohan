import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getFeeCollectionChart: () => api.get('/dashboard/fee-collection-chart'),
  getClassDistribution: () => api.get('/dashboard/class-distribution'),
};

// Students API
export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  getFeeStructure: (id) => api.get(`/students/${id}/fee-structure`),
  updateFeeStructure: (id, data) => api.put(`/students/${id}/fee-structure`, data),
};

// Staff API
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  getSalaryHistory: (id, params) => api.get(`/staff/${id}/salary-history`, { params }),
};

// Classes API
export const classesAPI = {
  getAll: () => api.get('/classes'),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  getAvailableTeachers: () => api.get('/classes/available/teachers'),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getAvailableStaff: () => api.get('/users/available/staff'),
};

// Fees API
export const feesAPI = {
  getTypes: () => api.get('/fees/types'),
  createType: (data) => api.post('/fees/types', data),
  updateType: (id, data) => api.put(`/fees/types/${id}`, data),
  deleteType: (id) => api.delete(`/fees/types/${id}`),
  getClassFeeStructure: (params) => api.get('/fees/class-structure', { params }),
  createClassFeeStructure: (data) => api.post('/fees/class-structure', data),
  deleteClassFeeStructure: (id) => api.delete(`/fees/class-structure/${id}`),
  getClassStructure: (classId) => api.get(`/fees/class/${classId}/structure`),
  getRecords: (params) => api.get('/fees/records', { params }),
  getCollectionRecords: (params) => api.get('/fees/collection-records', { params }),
  getCollectionDetails: (collectionId) => api.get(`/fees/collection-details/${collectionId}`),
  recordPayment: (data) => api.post('/fees/payment', data),
  generateFees: (data) => api.post('/fees/generate', data),
  getDueSummary: () => api.get('/fees/due-summary'),
  getStudentFeeSummary: (studentId) => api.get(`/fees/student-summary/${studentId}`),
  processPaymentWithRatio: (data) => api.post('/finance/payment-with-ratio', data),
  getPaymentSummaries: () => api.get('/finance/payment-summaries'),
};

// Finance API
export const financeAPI = {
  getAccounts: () => api.get('/finance/accounts'),
  createAccount: (data) => api.post('/finance/accounts', data),
  deleteAccount: (id) => api.delete(`/finance/accounts/${id}`),
  getTransactions: (params) => api.get('/finance/transactions', { params }),
  createTransaction: (data) => api.post('/finance/transactions', data),
  getSummary: () => api.get('/finance/summary'),
  triggerAutoGeneration: () => api.post('/finance/trigger-auto-generation'),
};

// Upload API
export const uploadAPI = {
  uploadStudentImage: (formData) => api.post('/upload/student-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;