import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // таймаут
});

// перехватчик
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData: any) => api.post('/auth/register', userData),
  login: (credentials: any) => api.post('/auth/login', credentials),
};

export const subjectsAPI = {
  getAll: () => api.get('/subjects'),
  getById: (id: string) => api.get(`/subjects/${id}`),
};

// функция для проверки подключения к бэку
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.warn('Backend is not available:', error);
    return false;
  }
};

export default api;
