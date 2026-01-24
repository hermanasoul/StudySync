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

// Интерфейсы для уровней
export interface UserLevel {
  level: number;
  name: string;
  description: string;
  requiredPoints: number;
  icon: string;
  color: string;
  unlocks: any;
}

export interface LevelProgress {
  level: number;
  experiencePoints: number;
  totalAchievementPoints: number;
  currentLevel: UserLevel | null;
  nextLevel: UserLevel | null;
  progressPercentage: number;
  pointsToNextLevel: number;
  lastLevelUp: string;
  rank: number;
  totalUsers: number;
  percentile: number;
  recentLevelUps: any[];
}

export interface ExperienceHistory {
  id: string;
  points: number;
  reason: string;
  reasonLabel: string;
  sourceId: string;
  details: any;
  newTotal: number;
  createdAt: string;
}

export interface LevelLeaderboardUser {
  rank: number;
  id: string;
  name: string;
  email: string;
  level: number;
  experiencePoints: number;
  totalAchievementPoints: number;
  createdAt: string;
}

export interface LevelPosition {
  byLevel: number;
  byExperience: number;
  totalUsers: number;
}

export interface LevelStats {
  totalUsers: number;
  averageLevel: number;
  averageExperience: number;
  levelDistribution: Array<{ _id: number; count: number }>;
  topLevelUser: any;
  topExperienceUser: any;
}

// Интерфейсы для бейджей
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  difficultyColor: string;
  points: number;
  unlockedAt: string;
  isDisplayed: boolean;
}

export interface BadgeCollection {
  displayed: Array<{
    achievementId: string;
    position: number;
    name: string;
    icon: string;
    difficulty: string;
    difficultyColor: string;
    points: number;
    category: string;
  }>;
  all: Badge[];
  byCategory: {
    study: Badge[];
    group: Badge[];
    flashcard: Badge[];
    note: Badge[];
    social: Badge[];
    system: Badge[];
  };
  stats: {
    total: number;
    displayedCount: number;
    byDifficulty: {
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
    };
  };
}

export interface Streak {
  current: number;
  longest: number;
  lastActiveDate: string;
  streakType: 'daily' | 'weekly' | 'monthly';
}

// Интерфейсы для заданий
export interface Quest {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special' | 'achievement';
  typeLabel: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  difficultyClass: string;
  difficultyColor: string;
  points: number;
  requirements: any;
  rewards: {
    experience: number;
    coins: number;
    items: any[];
    achievementId?: string;
  };
  timeLimit: number;
  userProgress?: {
    progress: number;
    requiredProgress: number;
    isCompleted: boolean;
    completedAt?: string;
    claimed: boolean;
    expiresAt?: string;
  };
}

export interface QuestStats {
  totalCompleted: number;
  totalClaimed: number;
  totalPoints: number;
  totalExperience: number;
  dailyStreak: number;
  byType: {
    [key: string]: {
      completed: number;
      claimed: number;
      points: number;
    };
  };
  byCategory: {
    [key: string]: {
      completed: number;
      claimed: number;
      points: number;
    };
  };
}

// Интерфейсы для наград
export interface ThemePreview {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  gradient: string;
}

export interface EffectPreview {
  name: string;
  description: string;
  animation: string | null;
}

export interface RewardItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  requiresLevel: number;
  unlocked: boolean;
  canUnlock: boolean;
}

export interface UserRewards {
  unlockedThemes: string[];
  unlockedBadgeFrames: string[];
  unlockedAvatarEffects: string[];
  unlockedSpecialAbilities: string[];
  unlockedProfileBackgrounds: string[];
  unlockedOther: any;
}

export interface AvailableRewards {
  themes: RewardItem[];
  avatarEffects: RewardItem[];
  badgeFrames: RewardItem[];
  profileBackgrounds: RewardItem[];
  specialAbilities: RewardItem[];
}

export interface ActiveRewards {
  theme: string;
  avatarEffect: string;
  badgeFrame: string;
  profileBackground: string;
}

export interface RewardsData {
  available: AvailableRewards;
  unlocked: UserRewards;
  active: ActiveRewards;
  stats: {
    totalUnlocked: number;
    level: number;
  };
}

// Интерфейсы для социальных функций
export interface Friend {
  friendshipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  level: number;
  experiencePoints: number;
  status: string;
  isRequester: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  friendshipId: string;
  requester: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
    level: number;
    experiencePoints: number;
  };
  status: string;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  level: number;
  experiencePoints: number;
  followerCount: number;
  followingCount: number;
  friendshipStatus: string | null;
  isRequester?: boolean;
}

export interface FollowInfo {
  followId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  level: number;
  experiencePoints: number;
  notificationsEnabled: boolean;
  followedAt: string;
  isFollowing?: boolean;
}

export interface LeaderboardRanking {
  userId: string;
  rank: number;
  score: number;
  metric: string;
  details: {
    name: string;
    avatarUrl: string;
    level: number;
    additionalStats: any;
  };
  previousRank?: number;
  rankChange?: number;
}

export interface LeaderboardData {
  leaderboard: {
    type: string;
    metric: string;
    period: {
      startDate: string;
      endDate: string;
    };
    lastUpdated: string;
    rankings: LeaderboardRanking[];
  };
  userRank: {
    rank: number;
    score: number;
    totalParticipants: number;
    percentile: number;
  } | null;
  totalParticipants: number;
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

// Методы для работы с уведомлениями
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

// Методы для работы с уровнями
export const levelsAPI = {
  // Получение всех уровней
  getAll: () => api.get('/levels'),
  
  // Получение уровня по номеру
  getByLevel: (level: number) => api.get(`/levels/${level}`),
  
  // Получение прогресса текущего пользователя
  getMyProgress: () => api.get('/levels/progress/my'),
  
  // Получение истории опыта
  getExperienceHistory: (params?: {
    page?: number;
    limit?: number;
  }) => api.get('/levels/experience/history', { params }),
  
  // Получение лидерборда по уровням
  getLeaderboard: (params?: {
    limit?: number;
    sortBy?: 'level' | 'experience';
  }) => api.get('/levels/leaderboard/top', { params }),
  
  // Получение позиции текущего пользователя в лидерборде
  getMyPosition: () => api.get('/levels/leaderboard/my-position'),
  
  // Получение статистики по уровням
  getStats: () => api.get('/levels/stats/overview'),
};

// Методы для работы с бейджами
export const badgesAPI = {
  // Получение бейджей пользователя
  getMyBadges: () => api.get('/badges/my-badges'),
  
  // Добавление бейджа в отображаемые
  addDisplayedBadge: (achievementId: string, position?: number) => 
    api.post('/badges/display-badge', { achievementId, position }),
  
  // Удаление бейджа из отображаемые
  removeDisplayedBadge: (achievementId: string) => 
    api.delete(`/badges/remove-displayed-badge/${achievementId}`),
  
  // Обновление порядка бейджей
  reorderBadges: (badgesOrder: string[]) => 
    api.put('/badges/reorder-badges', { badgesOrder }),
  
  // Получение серии
  getStreak: () => api.get('/badges/streak'),
  
  // Обновление серии
  updateStreak: () => api.post('/badges/update-streak'),
  
  // Получение статистики
  getStats: () => api.get('/badges/stats'),
};

// Методы для работы с заданиями
export const questsAPI = {
  // Получение всех заданий
  getAll: (params?: {
    type?: string;
    category?: string;
    difficulty?: string;
  }) => api.get('/quests', { params }),
  
  // Получение заданий пользователя
  getMyQuests: () => api.get('/quests/my-quests'),
  
  // Получение конкретного задания
  getById: (questId: string) => api.get(`/quests/${questId}`),
  
  // Обновление прогресса задания
  updateProgress: (questCode: string, progress?: number) => 
    api.post(`/quests/update-progress/${questCode}`, { progress }),
  
  // Завершение задания и получение наград
  claimReward: (userQuestId: string) => 
    api.post(`/quests/claim/${userQuestId}`),
  
  // Получение статистики по заданиям
  getStats: () => api.get('/quests/stats/my'),
  
  // Генерация ежедневных заданий
  generateDaily: () => api.post('/quests/generate-daily'),
};

// Методы для работы с наградами
export const rewardsAPI = {
  // Получение всех доступных наград
  getAvailable: () => api.get('/rewards/available'),
  
  // Получение наград пользователя
  getMy: () => api.get('/rewards/my'),
  
  // Применение темы
  applyTheme: (theme: string) => api.post('/rewards/apply-theme', { theme }),
  
  // Применение эффекта аватара
  applyAvatarEffect: (effect: string) => api.post('/rewards/apply-avatar-effect', { effect }),
  
  // Применение рамки для бейджей
  applyBadgeFrame: (frame: string) => api.post('/rewards/apply-badge-frame', { frame }),
  
  // Применение фона профиля
  applyProfileBackground: (background: string) => 
    api.post('/rewards/apply-profile-background', { background }),
  
  // Получение предпросмотра темы
  getThemePreview: (theme: string) => api.get(`/rewards/preview-theme/${theme}`),
  
  // Получение предпросмотра эффекта аватара
  getAvatarEffectPreview: (effect: string) => 
    api.get(`/rewards/preview-avatar-effect/${effect}`),
  
  // Сброс настроек к значениям по умолчанию
  resetDefaults: () => api.post('/rewards/reset-defaults'),
};

// Методы для работы с друзьями
export const friendsAPI = {
  // Получение списка друзей
  getFriends: (params?: { status?: string; limit?: number; skip?: number }) =>
    api.get('/friends', { params }),
  
  // Получение входящих запросов
  getIncomingRequests: () => api.get('/friends/requests/incoming'),
  
  // Получение исходящих запросов
  getOutgoingRequests: () => api.get('/friends/requests/outgoing'),
  
  // Отправка запроса в друзья
  sendRequest: (userId: string) => api.post(`/friends/request/${userId}`),
  
  // Принятие запроса
  acceptRequest: (friendshipId: string) => api.post(`/friends/accept/${friendshipId}`),
  
  // Отклонение запроса
  rejectRequest: (friendshipId: string) => api.post(`/friends/reject/${friendshipId}`),
  
  // Удаление из друзей
  removeFriend: (friendshipId: string) => api.delete(`/friends/${friendshipId}`),
  
  // Получение статуса дружбы
  getFriendshipStatus: (userId: string) => api.get(`/friends/status/${userId}`),
  
  // Поиск пользователей
  searchUsers: (query: string, params?: { excludeFriends?: boolean; limit?: number }) =>
    api.get('/friends/search', { params: { query, ...params } }),
  
  // Получение статистики друзей
  getFriendsStats: () => api.get('/friends/stats'),
};

// Методы для работы с подписками
export const followsAPI = {
  // Подписаться на пользователя
  followUser: (userId: string) => api.post(`/follows/follow/${userId}`),
  
  // Отписаться от пользователя
  unfollowUser: (userId: string) => api.delete(`/follows/follow/${userId}`),
  
  // Получить подписчиков
  getFollowers: (params?: { limit?: number; skip?: number }) =>
    api.get('/follows/followers', { params }),
  
  // Получить подписки
  getFollowing: (params?: { limit?: number; skip?: number }) =>
    api.get('/follows/following', { params }),
  
  // Получить подписчиков другого пользователя
  getUserFollowers: (userId: string, params?: { limit?: number; skip?: number }) =>
    api.get(`/follows/${userId}/followers`, { params }),
  
  // Получить подписки другого пользователя
  getUserFollowing: (userId: string, params?: { limit?: number; skip?: number }) =>
    api.get(`/follows/${userId}/following`, { params }),
  
  // Проверить подписку
  checkFollow: (userId: string) => api.get(`/follows/check/${userId}`),
  
  // Получить рекомендации
  getRecommendations: (params?: { limit?: number }) =>
    api.get('/follows/recommendations', { params }),
};

// Методы для работы с лидербордами
export const leaderboardsAPI = {
  // Базовый метод для получения лидербордов
  get: (endpoint: string, params?: any) => api.get(endpoint, { params }),
  
  // Глобальный лидерборд
  getGlobal: (params?: { metric?: string; limit?: number }) =>
    api.get('/leaderboards/global', { params }),
  
  // Групповой лидерборд
  getGroup: (groupId: string, params?: { metric?: string; limit?: number }) =>
    api.get(`/leaderboards/group/${groupId}`, { params }),
  
  // Лидерборд по предмету
  getSubject: (subjectId: string, params?: { metric?: string; limit?: number }) =>
    api.get(`/leaderboards/subject/${subjectId}`, { params }),
  
  // Еженедельный лидерборд
  getWeekly: (params?: { metric?: string; limit?: number }) =>
    api.get('/leaderboards/weekly', { params }),
  
  // Ежемесячный лидерборд
  getMonthly: (params?: { metric?: string; limit?: number }) =>
    api.get('/leaderboards/monthly', { params }),
  
  // Сравнение с друзьями
  compareWithFriends: () => api.get('/leaderboards/compare/friends'),
  
  // Статистика лидербордов
  getStats: () => api.get('/leaderboards/stats'),
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