import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studysync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const flashcardsAPI = {
  create: (data: any) => api.post('/flashcards', data),
  getBySubject: (subjectId: string) => api.get(`/flashcards/subject/${subjectId}`),
  getForStudy: (subjectId: string) => api.get(`/flashcards/study/${subjectId}`),
  markAsKnown: (id: string) => api.put(`/flashcards/${id}/know`),
  markAsUnknown: (id: string) => api.put(`/flashcards/${id}/dont-know`),
  update: (id: string, data: any) => api.put(`/flashcards/${id}`, data),
  delete: (id: string) => api.delete(`/flashcards/${id}`),
};

export const groupsAPI = {
  create: (data: any) => api.post('/groups', data),
  getMyGroups: () => api.get('/groups/my'),
  getById: (id: string) => api.get(`/groups/${id}`),
  update: (id: string, data: any) => api.put(`/groups/${id}`, data),
  invite: (id: string, email: string) => api.post(`/groups/${id}/invite`, { email }),
  join: (inviteCode: string) => api.post(`/groups/join/${inviteCode}`),
  getFlashcards: (id: string) => api.get(`/groups/${id}/flashcards`),
  getNotes: (id: string) => api.get(`/groups/${id}/notes`),
};

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
