import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studysync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const groupsAPI = {
  getMy: () => api.get('/groups/my'),
  getById: (id: string) => api.get(`/groups/${id}`),
  create: (data: any) => api.post('/groups', data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  getMembers: (id: string) => api.get(`/groups/${id}/members`),
  getNotes: (id: string) => api.get(`/groups/${id}/notes`),
  createFlashcard: (groupId: string, flashcardData: any) => 
    api.post(`/groups/${groupId}/flashcards`, flashcardData),
  createNote: (groupId: string, noteData: any) => 
    api.post(`/groups/${groupId}/notes`, noteData),
  createInvite: (groupId: string, email: string) => 
    api.post(`/groups/${groupId}/invite`, { email }),
  join: (inviteCode: string) => api.post('/groups/join', { inviteCode }),
  getFlashcards: (groupId: string) => api.get(`/groups/${groupId}/flashcards`),
};

export const subjectsAPI = {
  getAll: () => api.get('/subjects'),
};

export const flashcardsAPI = {
  getBySubject: (subjectId: string) => api.get(`/flashcards/subject/${subjectId}`),
  getForStudy: (subjectId: string) => api.get(`/flashcards/study/${subjectId}`),
  create: (data: any) => api.post('/flashcards', data),
  update: (id: string, data: any) => api.put(`/flashcards/${id}`, data),
  delete: (id: string) => api.delete(`/flashcards/${id}`),
  markAsKnown: (id: string) => api.post(`/flashcards/${id}/known`),
  markAsUnknown: (id: string) => api.post(`/flashcards/${id}/unknown`),
};

export const notesAPI = {
  getBySubject: (subjectId: string) => api.get(`/notes/subject/${subjectId}`),
  create: (data: any) => api.post('/notes', data),
  update: (id: string, data: any) => api.put(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
};

export default api;
