const express = require('express');
const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение глобального лидерборда
router.get('/global', auth, catchAsync(async (req, res) => {
  const { metric = 'experience', limit = 50 } = req.query;
  
  const leaderboard = await Leaderboard.getLeaderboard('global', metric, null, parseInt(limit));
  
  // Получаем позицию текущего пользователя
  const userRank = await Leaderboard.getUserRank(req.user.id, 'global', metric);
  
  res.json({
    success: true,
    data: {
      leaderboard: {
        type: 'global',
        metric,
        period: leaderboard.period,
        lastUpdated: leaderboard.lastUpdated,
        rankings: leaderboard.rankings.slice(0, parseInt(limit))
      },
      userRank,
      totalParticipants: leaderboard.totalParticipants
    }
  });
}));

// Получение группового лидерборда
router.get('/group/:groupId', auth, catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { metric = 'experience', limit = 20 } = req.query;
  
  const Group = require('../models/Group');
  const group = await Group.findById(groupId);
  
  if (!group) {
    throw new AppError('Группа не найдена', 404);
  }
  
  // Проверяем, является ли пользователь участником группы
  const isMember = group.members.some(member => 
    member.user.toString() === req.user.id.toString()
  );
  
  if (!isMember && !group.isPublic) {
    throw new AppError('У вас нет доступа к лидерборду этой группы', 403);
  }
  
  const leaderboard = await Leaderboard.getLeaderboard('group', metric, groupId, parseInt(limit));
  
  // Получаем позицию текущего пользователя
  const userRank = await Leaderboard.getUserRank(req.user.id, 'group', metric, groupId);
  
  res.json({
    success: true,
    data: {
      leaderboard: {
        type: 'group',
        scopeId: groupId,
        scopeName: group.name,
        metric,
        period: leaderboard.period,
        lastUpdated: leaderboard.lastUpdated,
        rankings: leaderboard.rankings.slice(0, parseInt(limit))
      },
      userRank,
      totalParticipants: leaderboard.totalParticipants
    }
  });
}));

// Получение лидерборда по предмету
router.get('/subject/:subjectId', auth, catchAsync(async (req, res) => {
  const { subjectId } = req.params;
  const { metric = 'experience', limit = 30 } = req.query;
  
  const Subject = require('../models/Subject');
  const subject = await Subject.findById(subjectId);
  
  if (!subject) {
    throw new AppError('Предмет не найден', 404);
  }
  
  const leaderboard = await Leaderboard.getLeaderboard('subject', metric, subjectId, parseInt(limit));
  
  // Получаем позицию текущего пользователя
  const userRank = await Leaderboard.getUserRank(req.user.id, 'subject', metric, subjectId);
  
  res.json({
    success: true,
    data: {
      leaderboard: {
        type: 'subject',
        scopeId: subjectId,
        scopeName: subject.name,
        metric,
        period: leaderboard.period,
        lastUpdated: leaderboard.lastUpdated,
        rankings: leaderboard.rankings.slice(0, parseInt(limit))
      },
      userRank,
      totalParticipants: leaderboard.totalParticipants
    }
  });
}));

// Получение еженедельного лидерборда
router.get('/weekly', auth, catchAsync(async (req, res) => {
  const { metric = 'experience', limit = 50 } = req.query;
  
  const leaderboard = await Leaderboard.getLeaderboard('weekly', metric, null, parseInt(limit));
  
  // Получаем позицию текущего пользователя
  const userRank = await Leaderboard.getUserRank(req.user.id, 'weekly', metric);
  
  res.json({
    success: true,
    data: {
      leaderboard: {
        type: 'weekly',
        metric,
        period: leaderboard.period,
        lastUpdated: leaderboard.lastUpdated,
        rankings: leaderboard.rankings.slice(0, parseInt(limit))
      },
      userRank,
      totalParticipants: leaderboard.totalParticipants
    }
  });
}));

// Получение ежемесячного лидерборда
router.get('/monthly', auth, catchAsync(async (req, res) => {
  const { metric = 'experience', limit = 50 } = req.query;
  
  const leaderboard = await Leaderboard.getLeaderboard('monthly', metric, null, parseInt(limit));
  
  // Получаем позицию текущего пользователя
  const userRank = await Leaderboard.getUserRank(req.user.id, 'monthly', metric);
  
  res.json({
    success: true,
    data: {
      leaderboard: {
        type: 'monthly',
        metric,
        period: leaderboard.period,
        lastUpdated: leaderboard.lastUpdated,
        rankings: leaderboard.rankings.slice(0, parseInt(limit))
      },
      userRank,
      totalParticipants: leaderboard.totalParticipants
    }
  });
}));

// Сравнение с друзьями
router.get('/compare/friends', auth, catchAsync(async (req, res) => {
  const Friendship = require('../models/Friendship');
  
  // Получаем список друзей
  const friends = await Friendship.getFriends(req.user.id, { status: 'accepted' });
  
  // Получаем данные текущего пользователя
  const currentUser = await User.findById(req.user.id)
    .select('name level experiencePoints achievementStats streaks');
  
  // Подготавливаем данные для сравнения
  const comparison = friends.map(friend => ({
    userId: friend.userId,
    name: friend.name,
    avatarUrl: friend.avatarUrl,
    level: friend.level,
    experiencePoints: friend.experiencePoints,
    levelDifference: friend.level - currentUser.level,
    experienceDifference: friend.experiencePoints - currentUser.experiencePoints,
    relativeLevel: friend.level > currentUser.level ? 'higher' : 
                  friend.level < currentUser.level ? 'lower' : 'equal',
    relativeExperience: friend.experiencePoints > currentUser.experiencePoints ? 'higher' : 
                       friend.experiencePoints < currentUser.experiencePoints ? 'lower' : 'equal'
  }));
  
  // Сортируем по уровню и опыту
  const sortedByLevel = [...comparison].sort((a, b) => b.level - a.level || b.experiencePoints - a.experiencePoints);
  const sortedByExperience = [...comparison].sort((a, b) => b.experiencePoints - a.experiencePoints);
  
  // Находим позицию текущего пользователя среди друзей
  const allUsers = [
    {
      userId: currentUser._id,
      name: currentUser.name,
      level: currentUser.level,
      experiencePoints: currentUser.experiencePoints,
      isCurrentUser: true
    },
    ...friends.map(friend => ({
      userId: friend.userId,
      name: friend.name,
      level: friend.level,
      experiencePoints: friend.experiencePoints,
      isCurrentUser: false
    }))
  ];
  
  const rankedByLevel = [...allUsers].sort((a, b) => b.level - a.level || b.experiencePoints - a.experiencePoints);
  const rankedByExperience = [...allUsers].sort((a, b) => b.experiencePoints - a.experiencePoints);
  
  const currentUserLevelRank = rankedByLevel.findIndex(user => user.isCurrentUser) + 1;
  const currentUserExperienceRank = rankedByExperience.findIndex(user => user.isCurrentUser) + 1;
  
  res.json({
    success: true,
    data: {
      currentUser: {
        id: currentUser._id,
        name: currentUser.name,
        level: currentUser.level,
        experiencePoints: currentUser.experiencePoints,
        achievementStats: currentUser.achievementStats,
        streak: currentUser.streaks?.current || 0
      },
      friendsComparison: comparison,
      rankings: {
        byLevel: sortedByLevel,
        byExperience: sortedByExperience,
        currentUserLevelRank,
        currentUserExperienceRank,
        totalFriends: friends.length
      },
      stats: {
        averageFriendLevel: friends.length > 0 
          ? Math.round(friends.reduce((sum, f) => sum + f.level, 0) / friends.length)
          : 0,
        averageFriendExperience: friends.length > 0
          ? Math.round(friends.reduce((sum, f) => sum + f.experiencePoints, 0) / friends.length)
          : 0,
        highestLevelFriend: sortedByLevel[0] || null,
        mostExperiencedFriend: sortedByExperience[0] || null
      }
    }
  });
}));

// Получение общей статистики лидербордов
router.get('/stats', auth, catchAsync(async (req, res) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Количество активных лидербордов
  const activeLeaderboards = await Leaderboard.countDocuments({
    'period.endDate': { $gt: today },
    isActive: true
  });
  
  // Самые популярные метрики
  const metricStats = await Leaderboard.aggregate([
    { $match: { 'period.endDate': { $gt: today }, isActive: true } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  // Общее количество участников во всех лидербордах
  const totalParticipants = await Leaderboard.aggregate([
    { $match: { 'period.endDate': { $gt: today }, isActive: true } },
    { $group: { _id: null, total: { $sum: '$totalParticipants' } } }
  ]);
  
  res.json({
    success: true,
    data: {
      activeLeaderboards,
      metricStats,
      totalParticipants: totalParticipants[0]?.total || 0,
      lastUpdated: today
    }
  });
}));

// Обновление лидерборда (административная функция)
router.post('/update/:type', auth, catchAsync(async (req, res) => {
  const { type } = req.params;
  const { metric = 'experience', scopeId = null, scopeName = '' } = req.body;
  
  // Проверяем права (только администраторы могут обновлять лидерборды)
  const user = await User.findById(req.user.id);
  if (user.role !== 'admin') {
    throw new AppError('Недостаточно прав для обновления лидербордов', 403);
  }
  
  const leaderboard = await Leaderboard.updateLeaderboard(type, metric, scopeId, scopeName);
  
  res.json({
    success: true,
    message: 'Лидерборд обновлен',
    data: {
      leaderboardId: leaderboard._id,
      type: leaderboard.type,
      metric,
      totalParticipants: leaderboard.totalParticipants,
      lastUpdated: leaderboard.lastUpdated
    }
  });
}));

module.exports = router;