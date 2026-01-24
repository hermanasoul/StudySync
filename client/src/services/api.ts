import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studysync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Токен истек или недействителен
      localStorage.removeItem('studysync_token');
      localStorage.removeItem('studysync_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Интерфейсы для учебных сессий
export interface StudySession {
  _id: string;
  name: string;
  description: string;
  host: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  participants: Array<{
    user: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
    role: 'host' | 'co-host' | 'participant';
    status: 'active' | 'away' | 'left';
    stats: {
      timeSpent: number;
      cardsReviewed: number;
      correctAnswers: number;
      streak: number;
    };
  }>;
  subjectId: {
    _id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  groupId?: {
    _id: string;
    name: string;
  };
  accessType: 'public' | 'friends' | 'private';
  studyMode: 'collaborative' | 'individual' | 'host-controlled';
  flashcards: Array<{
    flashcardId: {
      _id: string;
      question: string;
      answer: string;
      hint?: string;
      difficulty: string;
    };
    order: number;
    reviewedBy: Array<{
      user: string;
      isCorrect: boolean;
      reviewedAt: string;
    }>;
  }>;
  currentFlashcardIndex: number;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    autoSwitch: boolean;
  };
  timerState: {
    active: boolean;
    type: 'work' | 'break';
    startTime?: string;
    remaining: number;
    totalElapsed: number;
  };
  status: 'waiting' | 'active' | 'paused' | 'completed';
  sessionStats: {
    totalTime: number;
    totalCardsReviewed: number;
    averageSuccessRate: number;
  };
  invitedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudySessionStats {
  session: {
    totalCards: number;
    totalReviewed: number;
    totalCorrect: number;
    totalTime: number;
    averageSuccessRate: number;
    participantCount: number;
  };
  participants: Array<{
    user: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
    stats: {
      timeSpent: number;
      cardsReviewed: number;
      correctAnswers: number;
      streak: number;
    };
    successRate: number;
  }>;
  leaderboard: Array<{
    user: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
    stats: {
      timeSpent: number;
      cardsReviewed: number;
      correctAnswers: number;
      streak: number;
    };
    successRate: number;
  }>;
}

export interface CreateStudySessionData {
  name: string;
  description?: string;
  subjectId: string;
  groupId?: string;
  accessType?: 'public' | 'friends' | 'private';
  studyMode?: 'collaborative' | 'individual' | 'host-controlled';
  pomodoroSettings?: {
    workDuration?: number;
    breakDuration?: number;
    autoSwitch?: boolean;
  };
  flashcardIds?: string[];
}

// Существующие интерфейсы (оставлены для совместимости)
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

// Методы для работы с учебными сессиями
export const studySessionsAPI = {
  // Создание сессии
  create: (data: CreateStudySessionData) => 
    api.post('/study-sessions', data),
  
  // Получение активных сессий
  getActive: (params?: {
    accessType?: string;
    subjectId?: string;
    groupId?: string;
    friendsOnly?: boolean;
  }) => api.get('/study-sessions/active', { params }),
  
  // Присоединение к сессии
  join: (sessionId: string) => 
    api.post(`/study-sessions/${sessionId}/join`),
  
  // Получение информации о сессии
  getById: (sessionId: string) => 
    api.get(`/study-sessions/${sessionId}`),
  
  // Управление таймером
  updateTimer: (sessionId: string, data: { 
    action: 'start' | 'pause' | 'reset' | 'switch'; 
    timerType?: 'work' | 'break' 
  }) => api.post(`/study-sessions/${sessionId}/timer`, data),
  
  // Управление карточками
  updateFlashcards: (sessionId: string, data: {
    action: 'next' | 'previous' | 'jump' | 'answer';
    flashcardId?: string;
    answer?: 'correct' | 'incorrect';
    index?: number;
  }) => api.post(`/study-sessions/${sessionId}/flashcards`, data),
  
  // Выход из сессии
  leave: (sessionId: string) => 
    api.post(`/study-sessions/${sessionId}/leave`),
  
  // Получение статистики
  getStats: (sessionId: string) => 
    api.get(`/study-sessions/${sessionId}/stats`),
  
  // Приглашение пользователей
  invite: (sessionId: string, userIds: string[]) => 
    api.post(`/study-sessions/${sessionId}/invite`, { userIds }),
  
  // Изменение настроек
  updateSettings: (sessionId: string, data: {
    studyMode?: string;
    pomodoroSettings?: any;
    notifications?: any;
    accessType?: string;
  }) => api.put(`/study-sessions/${sessionId}/settings`, data),
  
  // Получение сессий пользователя
  getMySessions: (params?: { 
    status?: string;
    limit?: number;
    skip?: number;
  }) => api.get('/study-sessions/my', { params }),
  
  // Завершение сессии
  complete: (sessionId: string) => 
    api.post(`/study-sessions/${sessionId}/complete`),
};

// Существующие методы API (оставлены для совместимости)
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

export const notificationsAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    read?: string;
  }) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getById: (id: string) => api.get(`/notifications/${id}`),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  archive: (id: string) => api.put(`/notifications/${id}/archive`),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  cleanupRead: () => api.delete('/notifications/cleanup/read'),
  createTest: (data: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) => api.post('/notifications/test', data),
  getStats: () => api.get('/notifications/stats/overview'),
};

export const achievementsAPI = {
  getAll: (params?: {
    category?: string;
    difficulty?: string;
    unlocked?: string;
    page?: number;
    limit?: number;
  }) => api.get('/achievements', { params }),
  getMy: () => api.get('/achievements/my'),
  getProgress: () => api.get('/achievements/progress'),
  getById: (id: string) => api.get(`/achievements/${id}`),
  check: (achievementCode: string, progress?: number) => 
    api.post(`/achievements/check/${achievementCode}`, { progress }),
  getLeaderboard: (params?: {
    limit?: number;
    category?: string;
  }) => api.get('/achievements/leaderboard/top', { params }),
  getMyPosition: () => api.get('/achievements/leaderboard/my-position'),
  getRecommendations: () => api.get('/achievements/recommendations/next'),
  reset: (achievementCode: string) => 
    api.delete(`/achievements/reset/${achievementCode}`),
};

export const levelsAPI = {
  getAll: () => api.get('/levels'),
  getByLevel: (level: number) => api.get(`/levels/${level}`),
  getMyProgress: () => api.get('/levels/progress/my'),
  getExperienceHistory: (params?: {
    page?: number;
    limit?: number;
  }) => api.get('/levels/experience/history', { params }),
  getLeaderboard: (params?: {
    limit?: number;
    sortBy?: 'level' | 'experience';
  }) => api.get('/levels/leaderboard/top', { params }),
  getMyPosition: () => api.get('/levels/leaderboard/my-position'),
  getStats: () => api.get('/levels/stats/overview'),
};

export const badgesAPI = {
  getMyBadges: () => api.get('/badges/my-badges'),
  addDisplayedBadge: (achievementId: string, position?: number) => 
    api.post('/badges/display-badge', { achievementId, position }),
  removeDisplayedBadge: (achievementId: string) => 
    api.delete(`/badges/remove-displayed-badge/${achievementId}`),
  reorderBadges: (badgesOrder: string[]) => 
    api.put('/badges/reorder-badges', { badgesOrder }),
  getStreak: () => api.get('/badges/streak'),
  updateStreak: () => api.post('/badges/update-streak'),
  getStats: () => api.get('/badges/stats'),
};

export const questsAPI = {
  getAll: (params?: {
    type?: string;
    category?: string;
    difficulty?: string;
  }) => api.get('/quests', { params }),
  getMyQuests: () => api.get('/quests/my-quests'),
  getById: (questId: string) => api.get(`/quests/${questId}`),
  updateProgress: (questCode: string, progress?: number) => 
    api.post(`/quests/update-progress/${questCode}`, { progress }),
  claimReward: (userQuestId: string) => 
    api.post(`/quests/claim/${userQuestId}`),
  getStats: () => api.get('/quests/stats/my'),
  generateDaily: () => api.post('/quests/generate-daily'),
};

export const rewardsAPI = {
  getAvailable: () => api.get('/rewards/available'),
  getMy: () => api.get('/rewards/my'),
  applyTheme: (theme: string) => api.post('/rewards/apply-theme', { theme }),
  applyAvatarEffect: (effect: string) => api.post('/rewards/apply-avatar-effect', { effect }),
  applyBadgeFrame: (frame: string) => api.post('/rewards/apply-badge-frame', { frame }),
  applyProfileBackground: (background: string) => 
    api.post('/rewards/apply-profile-background', { background }),
  getThemePreview: (theme: string) => api.get(`/rewards/preview-theme/${theme}`),
  getAvatarEffectPreview: (effect: string) => 
    api.get(`/rewards/preview-avatar-effect/${effect}`),
  resetDefaults: () => api.post('/rewards/reset-defaults'),
};

export const friendsAPI = {
  getFriends: (params?: { status?: string; limit?: number; skip?: number }) =>
    api.get('/friends', { params }),
  getIncomingRequests: () => api.get('/friends/requests/incoming'),
  getOutgoingRequests: () => api.get('/friends/requests/outgoing'),
  sendRequest: (userId: string) => api.post(`/friends/request/${userId}`),
  acceptRequest: (friendshipId: string) => api.post(`/friends/accept/${friendshipId}`),
  rejectRequest: (friendshipId: string) => api.post(`/friends/reject/${friendshipId}`),
  removeFriend: (friendshipId: string) => api.delete(`/friends/${friendshipId}`),
  getFriendshipStatus: (userId: string) => api.get(`/friends/status/${userId}`),
  searchUsers: (query: string, params?: { excludeFriends?: boolean; limit?: number }) =>
    api.get('/friends/search', { params: { query, ...params } }),
  getFriendsStats: () => api.get('/friends/stats'),
};

export const followsAPI = {
  followUser: (userId: string) => api.post(`/follows/follow/${userId}`),
  unfollowUser: (userId: string) => api.delete(`/follows/follow/${userId}`),
  getFollowers: (params?: { limit?: number; skip?: number }) =>
    api.get('/follows/followers', { params }),
  getFollowing: (params?: { limit?: number; skip?: number }) =>
    api.get('/follows/following', { params }),
  getUserFollowers: (userId: string, params?: { limit?: number; skip?: number }) =>
    api.get(`/follows/${userId}/followers`, { params }),
  getUserFollowing: (userId: string, params?: { limit?: number; skip?: number }) =>
    api.get(`/follows/${userId}/following`, { params }),
  checkFollow: (userId: string) => api.get(`/follows/check/${userId}`),
  getRecommendations: (params?: { limit?: number }) =>
    api.get('/follows/recommendations', { params }),
};

export const leaderboardsAPI = {
  getGlobal: (params?: { metric?: string; limit?: number }) =>
    api.get('/leaderboards/global', { params }),
  getGroup: (groupId: string, params?: { metric?: string; limit?: number }) =>
    api.get(`/leaderboards/group/${groupId}`, { params }),
  getSubject: (subjectId: string, params?: { metric?: string; limit?: number }) =>
    api.get(`/leaderboards/subject/${subjectId}`, { params }),
  getWeekly: (params?: { metric?: string; limit?: number }) =>
    api.get('/leaderboards/weekly', { params }),
  getMonthly: (params?: { metric?: string; limit?: number }) =>
    api.get('/leaderboards/monthly', { params }),
  compareWithFriends: () => api.get('/leaderboards/compare/friends'),
  getStats: () => api.get('/leaderboards/stats'),
};

export const chatsAPI = {
  getUserChats: (params?: { type?: string; limit?: number; skip?: number }) =>
    api.get('/chats', { params }),
  createChat: (data: {
    type: 'direct' | 'group';
    participantIds: string[];
    name?: string;
    description?: string;
    groupId?: string;
  }) => api.post('/chats', data),
  getChat: (chatId: string) => api.get(`/chats/${chatId}`),
  getChatMessages: (chatId: string, params?: {
    limit?: number;
    skip?: number;
    before?: string;
    after?: string;
  }) => api.get(`/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId: string, data: {
    content: string;
    replyTo?: string;
    attachments?: Array<{
      url: string;
      filename: string;
      fileType: string;
      size: number;
    }>;
  }) => api.post(`/chats/${chatId}/messages`, data),
  editMessage: (messageId: string, data: { content: string }) =>
    api.put(`/chats/messages/${messageId}`, data),
  deleteMessage: (messageId: string) => api.delete(`/chats/messages/${messageId}`),
  addParticipant: (chatId: string, userId: string) =>
    api.post(`/chats/${chatId}/participants`, { userId }),
  removeParticipant: (chatId: string, userId: string) =>
    api.delete(`/chats/${chatId}/participants/${userId}`),
  markChatAsRead: (chatId: string) => api.post(`/chats/${chatId}/read`),
};

// Вспомогательные функции
export const validateInviteCode = (code: string): { isValid: boolean; message?: string } => {
  if (!code) return { isValid: false, message: 'Пустой код' };
  if (code.length < 6) return { isValid: false, message: 'Короткий код' };
  return { isValid: true };
};

export const normalizeSubject = (subject: string): string => subject.trim().toLowerCase();

export type Role = 'owner' | 'member' | 'admin' | 'guest';

const validRoles: Role[] = ['owner', 'member', 'admin', 'guest'];

export const isValidRole = (role: string): boolean => validRoles.includes(role as Role);

export default api;