// server/routes/leaderboards.js

const express = require('express');
const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Leaderboards
 *   description: Рейтинги и лидерборды пользователей
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         name:
 *           type: string
 *         avatarUrl:
 *           type: string
 *         level:
 *           type: number
 *         experiencePoints:
 *           type: number
 *         rank:
 *           type: number
 *         score:
 *           type: number
 *         metric:
 *           type: string
 *     Leaderboard:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *         metric:
 *           type: string
 *         period:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date-time
 *             endDate:
 *               type: string
 *               format: date-time
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *         rankings:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LeaderboardEntry'
 *         totalParticipants:
 *           type: number
 */

/**
 * @swagger
 * /leaderboards/global:
 *   get:
 *     summary: Получить глобальный лидерборд
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [experience, level, achievements, streak]
 *           default: experience
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Глобальный лидерборд
 */
router.get('/global', auth, catchAsync(async (req, res) => {
  const { metric = 'experience', limit = 50 } = req.query;
  const leaderboard = await Leaderboard.getLeaderboard('global', metric, null, parseInt(limit));
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

/**
 * @swagger
 * /leaderboards/group/{groupId}:
 *   get:
 *     summary: Получить лидерборд группы
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [experience, level, achievements, streak]
 *           default: experience
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Лидерборд группы
 */
router.get('/group/:groupId', auth, catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { metric = 'experience', limit = 20 } = req.query;
  const Group = require('../models/Group');
  const group = await Group.findById(groupId);
  if (!group) throw new AppError('Группа не найдена', 404);

  const isMember = group.members.some(m => m.user.toString() === req.user.id.toString());
  if (!isMember && !group.isPublic) throw new AppError('У вас нет доступа к лидерборду этой группы', 403);

  const leaderboard = await Leaderboard.getLeaderboard('group', metric, groupId, parseInt(limit));
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

/**
 * @swagger
 * /leaderboards/subject/{subjectId}:
 *   get:
 *     summary: Получить лидерборд по предмету
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [experience, level, achievements, streak]
 *           default: experience
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Лидерборд по предмету
 */
router.get('/subject/:subjectId', auth, catchAsync(async (req, res) => {
  const { subjectId } = req.params;
  const { metric = 'experience', limit = 30 } = req.query;
  const Subject = require('../models/Subject');
  const subject = await Subject.findById(subjectId);
  if (!subject) throw new AppError('Предмет не найден', 404);

  const leaderboard = await Leaderboard.getLeaderboard('subject', metric, subjectId, parseInt(limit));
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

/**
 * @swagger
 * /leaderboards/weekly:
 *   get:
 *     summary: Получить еженедельный лидерборд
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [experience, level, achievements, streak]
 *           default: experience
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Еженедельный лидерборд
 */
router.get('/weekly', auth, catchAsync(async (req, res) => {
  const { metric = 'experience', limit = 50 } = req.query;
  const leaderboard = await Leaderboard.getLeaderboard('weekly', metric, null, parseInt(limit));
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

/**
 * @swagger
 * /leaderboards/monthly:
 *   get:
 *     summary: Получить ежемесячный лидерборд
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [experience, level, achievements, streak]
 *           default: experience
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Ежемесячный лидерборд
 */
router.get('/monthly', auth, catchAsync(async (req, res) => {
  const { metric = 'experience', limit = 50 } = req.query;
  const leaderboard = await Leaderboard.getLeaderboard('monthly', metric, null, parseInt(limit));
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

/**
 * @swagger
 * /leaderboards/compare/friends:
 *   get:
 *     summary: Сравнение с друзьями по уровню и опыту
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные сравнения с друзьями
 */
router.get('/compare/friends', auth, catchAsync(async (req, res) => {
  const Friendship = require('../models/Friendship');
  const friends = await Friendship.getFriends(req.user.id, { status: 'accepted' });
  const currentUser = await User.findById(req.user.id).select('name level experiencePoints achievementStats streaks');

  const comparison = friends.map(f => ({
    userId: f.userId,
    name: f.name,
    avatarUrl: f.avatarUrl,
    level: f.level,
    experiencePoints: f.experiencePoints,
    levelDifference: f.level - currentUser.level,
    experienceDifference: f.experiencePoints - currentUser.experiencePoints,
    relativeLevel: f.level > currentUser.level ? 'higher' : f.level < currentUser.level ? 'lower' : 'equal',
    relativeExperience: f.experiencePoints > currentUser.experiencePoints ? 'higher' : f.experiencePoints < currentUser.experiencePoints ? 'lower' : 'equal'
  }));

  const sortedByLevel = [...comparison].sort((a,b) => b.level - a.level || b.experiencePoints - a.experiencePoints);
  const sortedByExperience = [...comparison].sort((a,b) => b.experiencePoints - a.experiencePoints);

  const allUsers = [
    { userId: currentUser._id, name: currentUser.name, level: currentUser.level, experiencePoints: currentUser.experiencePoints, isCurrentUser: true },
    ...friends.map(f => ({ userId: f.userId, name: f.name, level: f.level, experiencePoints: f.experiencePoints, isCurrentUser: false }))
  ];

  const rankedByLevel = [...allUsers].sort((a,b) => b.level - a.level || b.experiencePoints - a.experiencePoints);
  const rankedByExperience = [...allUsers].sort((a,b) => b.experiencePoints - a.experiencePoints);

  const currentUserLevelRank = rankedByLevel.findIndex(u => u.isCurrentUser) + 1;
  const currentUserExperienceRank = rankedByExperience.findIndex(u => u.isCurrentUser) + 1;

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
        averageFriendLevel: friends.length ? Math.round(friends.reduce((s,f) => s+f.level,0)/friends.length) : 0,
        averageFriendExperience: friends.length ? Math.round(friends.reduce((s,f) => s+f.experiencePoints,0)/friends.length) : 0,
        highestLevelFriend: sortedByLevel[0] || null,
        mostExperiencedFriend: sortedByExperience[0] || null
      }
    }
  });
}));

/**
 * @swagger
 * /leaderboards/stats:
 *   get:
 *     summary: Получить статистику лидербордов
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Общая статистика лидербордов
 */
router.get('/stats', auth, catchAsync(async (req, res) => {
  const today = new Date();
  const activeLeaderboards = await Leaderboard.countDocuments({ 'period.endDate': { $gt: today }, isActive: true });
  const metricStats = await Leaderboard.aggregate([
    { $match: { 'period.endDate': { $gt: today }, isActive: true } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
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

/**
 * @swagger
 * /leaderboards/update/{type}:
 *   post:
 *     summary: Обновить лидерборд (только для администраторов)
 *     tags: [Leaderboards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [global, group, subject, weekly, monthly]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metric:
 *                 type: string
 *                 enum: [experience, level, achievements, streak]
 *                 default: experience
 *               scopeId:
 *                 type: string
 *               scopeName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Лидерборд обновлён
 */
router.post('/update/:type', auth, catchAsync(async (req, res) => {
  const { type } = req.params;
  const { metric = 'experience', scopeId = null, scopeName = '' } = req.body;

  const user = await User.findById(req.user.id);
  if (user.role !== 'admin') throw new AppError('Недостаточно прав для обновления лидербордов', 403);

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