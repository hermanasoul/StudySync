import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor для добавления token в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studysync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Общие ошибки (логируем, но не блокируем)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Auth API (из предыдущих фиксов)
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateUsername: (newName: string) => api.put('/auth/user', { name: newName }),
};

// Groups API (обновлён: добавлены createFlashcard, getNotes, createNote, getMembers и т.д.)
export const groupsAPI = {
  // Основные
  create: (data: any) => api.post('/groups', data),
  getMy: () => api.get('/groups/my'),
  getById: (id: string) => api.get(`/groups/${id}`),
  update: (id: string, data: any) => api.put(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`), // Для будущего

  // Приглашения/присоединение
  createInvite: (groupId: string, email: string) => api.post(`/groups/${groupId}/invite`, { email }),
  join: (inviteCode: string) => api.post(`/groups/join/${inviteCode}`),

  // Участники (новое)
  getMembers: (groupId: string) => api.get(`/groups/${groupId}/members`),
  addMember: (groupId: string, userId: string, role?: string) =>
    api.post(`/groups/${groupId}/add-member`, { userId, role }),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`), // Если нужно

  // Заметки (новое)
  getNotes: (groupId: string) => api.get(`/groups/${groupId}/notes`),
  createNote: (groupId: string, data: any) => api.post(`/groups/${groupId}/notes`, data),

  // Карточки группы (новое; делегирует в flashcardsAPI.create с groupId)
  getFlashcards: (groupId: string) => api.get(`/groups/${groupId}/flashcards`),
  createFlashcard: (groupId: string, data: any) => api.post(`/groups/${groupId}/flashcards`, data),
};

// Flashcards API (обновлён: create теперь поддерживает groupId через groupsAPI)
export const flashcardsAPI = {
  create: (data: any) => {
    // Если groupId — используй groups endpoint, иначе общий /flashcards (если есть в backend)
    if (data.groupId) {
      return api.post(`/groups/${data.groupId}/flashcards`, data);
    }
    return api.post('/flashcards', data); // Fallback, если backend имеет общий роут
  },
  getBySubject: (subjectId: string) => api.get(`/flashcards/subject/${subjectId}`), // Или /subjects/${subjectId}/flashcards
  getForStudy: (subjectId: string) => api.get(`/flashcards/study/${subjectId}`),
  markAsKnown: (flashcardId: string) => api.put(`/flashcards/${flashcardId}/know`),
  markAsUnknown: (flashcardId: string) => api.put(`/flashcards/${flashcardId}/dontknow`),
  update: (flashcardId: string, data: any) => api.put(`/flashcards/${flashcardId}`, data),
  delete: (flashcardId: string) => api.delete(`/flashcards/${flashcardId}`),
  getByGroup: (groupId: string) => api.get(`/groups/${groupId}/flashcards`), // Через groups
};

// Notes API (новое; для EditGroupNoteModal и т.д.; с groupId в update/delete)
export const notesAPI = {
  create: (data: any, groupId?: string) => {
    if (groupId) {
      return api.post(`/groups/${groupId}/notes`, data);
    }
    return api.post('/notes', data); // Общий, если есть
  },
  getBySubject: (subjectId: string) => api.get(`/notes/subject/${subjectId}`),
  getByGroup: (groupId: string) => api.get(`/groups/${groupId}/notes`),
  update: (noteId: string, data: any, groupId: string) => api.put(`/groups/${groupId}/notes/${noteId}`, data), // Фикс: с groupId
  delete: (noteId: string, groupId: string) => api.delete(`/groups/${groupId}/notes/${noteId}`), // Фикс: с groupId
};

// Subjects API (для полноты; используй в Dashboard и т.д.)
export const subjectsAPI = {
  getAll: () => api.get('/subjects'), // Или /subjects/my
  getById: (id: string) => api.get(`/subjects/${id}`),
  create: (data: any) => api.post('/subjects', data),
  update: (id: string, data: any) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Health (для дебага)
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
