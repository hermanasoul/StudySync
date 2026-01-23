// client/src/services/api.ts

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

// Интерфейсы для достижений
export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'study' | 'group' | 'flashcard' | 'note' | 'social' | 'system';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  difficultyClass: string;
  difficultyColor: string;
  points: number;
  requirements: any;
  secret: boolean;
  progress?: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
  createdAt?: string;
}

export interface UserAchievement {
  id: string;
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementProgress {
  unlocked: number;
  total: number;
  totalPoints: number;
  byCategory: {
    [key: string]: {
      unlocked: number;
      total: number;
    };
  };
  byDifficulty: {
    [key: string]: {
      unlocked: number;
      total: number;
    };
  };
}

export interface LeaderboardUser {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string;
  totalPoints: number;
  unlockedCount: number;
  lastUnlock: string;
}

export interface LeaderboardPosition {
  position: number;
  totalUsers: number;
  userStats: {
    totalPoints: number;
    unlockedCount: number;
    lastUnlock: string;
  };
}

export interface AchievementRecommendation {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  difficulty: string;
  difficultyClass: string;
  difficultyColor: string;
  points: number;
  requirements: any;
  priority: number;
}

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

// Новые методы для работы с уведомлениями
export const notificationsAPI = {
  // Получение всех уведомлений с пагинацией
  getAll: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    read?: string;
  }) => api.get('/notifications', { params }),
  
  // Получение количества непрочитанных уведомлений
  getUnreadCount: () => api.get('/notifications/unread-count'),
  
  // Получение конкретного уведомления
  getById: (id: string) => api.get(`/notifications/${id}`),
  
  // Пометить уведомление как прочитанное
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  
  // Пометить все уведомления как прочитанные
  markAllAsRead: () => api.put('/notifications/read-all'),
  
  // Архивация уведомления
  archive: (id: string) => api.put(`/notifications/${id}/archive`),
  
  // Удаление уведомления
  delete: (id: string) => api.delete(`/notifications/${id}`),
  
  // Массовое удаление прочитанных уведомлений
  cleanupRead: () => api.delete('/notifications/cleanup/read'),
  
  // Создание тестового уведомления
  createTest: (data: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) => api.post('/notifications/test', data),
  
  // Получение статистики по уведомлениям
  getStats: () => api.get('/notifications/stats/overview'),
};

// Методы для работы с достижениями
export const achievementsAPI = {
  // Получение всех достижений с фильтрацией
  getAll: (params?: {
    category?: string;
    difficulty?: string;
    unlocked?: string;
    page?: number;
    limit?: number;
  }) => api.get('/achievements', { params }),
  
  // Получение достижений текущего пользователя
  getMy: () => api.get('/achievements/my'),
  
  // Получение прогресса пользователя
  getProgress: () => api.get('/achievements/progress'),
  
  // Получение конкретного достижения по ID
  getById: (id: string) => api.get(`/achievements/${id}`),
  
  // Проверка и обновление прогресса достижения
  check: (achievementCode: string, progress?: number) => 
    api.post(`/achievements/check/${achievementCode}`, { progress }),
  
  // Получение рейтинга пользователей
  getLeaderboard: (params?: {
    limit?: number;
    category?: string;
  }) => api.get('/achievements/leaderboard/top', { params }),
  
  // Получение позиции текущего пользователя в рейтинге
  getMyPosition: () => api.get('/achievements/leaderboard/my-position'),
  
  // Получение рекомендаций по достижениям
  getRecommendations: () => api.get('/achievements/recommendations/next'),
  
  // Сброс прогресса достижения (для тестирования)
  reset: (achievementCode: string) => 
    api.delete(`/achievements/reset/${achievementCode}`),
};

export default api;