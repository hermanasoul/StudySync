// server/routes/levels.js
const { body, param, query } = require('express-validator');
const express = require('express');
const mongoose = require('mongoose');
const UserLevel = require('../models/UserLevel');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Levels
 *   description: Система уровней и опыта
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLevel:
 *       type: object
 *       properties:
 *         level:
 *           type: number
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         requiredPoints:
 *           type: number
 *         icon:
 *           type: string
 *         color:
 *           type: string
 *         unlocks:
 *           type: object
 *         isActive:
 *           type: boolean
 *     LevelProgress:
 *       type: object
 *       properties:
 *         level:
 *           type: number
 *         experiencePoints:
 *           type: number
 *         totalAchievementPoints:
 *           type: number
 *         currentLevel:
 *           $ref: '#/components/schemas/UserLevel'
 *         nextLevel:
 *           $ref: '#/components/schemas/UserLevel'
 *         progressPercentage:
 *           type: number
 *         pointsToNextLevel:
 *           type: number
 *         rank:
 *           type: number
 *         percentile:
 *           type: number
 */

/**
 * @swagger
 * /levels:
 *   get:
 *     summary: Получить список всех уровней
 *     tags: [Levels]
 *     responses:
 *       200:
 *         description: Список уровней
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 levels:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserLevel'
 */
router.get('/',
  catchAsync(async (req, res) => {
    const levels = await UserLevel.find({ isActive: true })
      .sort({ level: 1 })
      .select('-__v -isActive');
    res.json({ success: true, count: levels.length, levels });
  })
);

/**
 * @swagger
 * /levels/{level}:
 *   get:
 *     summary: Получить информацию о конкретном уровне
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *         description: Номер уровня
 *     responses:
 *       200:
 *         description: Информация об уровне
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 level:
 *                   $ref: '#/components/schemas/UserLevel'
 */
router.get('/:level',
  catchAsync(async (req, res) => {
    const level = await UserLevel.findOne({ 
      level: req.params.level,
      isActive: true 
    }).select('-__v -isActive');
    if (!level) return res.status(404).json({ success: false, error: 'Уровень не найден' });
    res.json({ success: true, level });
  })
);

/**
 * @swagger
 * /levels/progress/my:
 *   get:
 *     summary: Получить прогресс текущего пользователя
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Прогресс пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   $ref: '#/components/schemas/LevelProgress'
 */
router.get('/progress/my',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('level experiencePoints totalAchievementPoints levelProgress');
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

    const currentLevel = await UserLevel.findOne({ level: user.level, isActive: true })
      .select('name description icon color unlocks');
    const nextLevel = await UserLevel.findOne({ level: user.level + 1, isActive: true })
      .select('name description requiredPoints icon color');

    const ExperienceHistory = require('../models/ExperienceHistory');
    const recentLevelUps = await ExperienceHistory.find({ userId: user._id, reason: 'level_up' })
      .sort({ createdAt: -1 }).limit(5).select('points details createdAt');

    const usersWithMorePoints = await User.countDocuments({ experiencePoints: { $gt: user.experiencePoints } });
    const totalUsers = await User.countDocuments();
    const rank = usersWithMorePoints + 1;
    const percentile = totalUsers > 0 ? Math.round((rank / totalUsers) * 100) : 100;

    res.json({
      success: true,
      progress: {
        level: user.level,
        experiencePoints: user.experiencePoints,
        totalAchievementPoints: user.totalAchievementPoints,
        currentLevel: currentLevel || null,
        nextLevel: nextLevel || null,
        progressPercentage: user.levelProgress.progressPercentage,
        pointsToNextLevel: user.levelProgress.pointsToNextLevel,
        lastLevelUp: user.levelProgress.lastLevelUp,
        rank, totalUsers, percentile,
        recentLevelUps
      }
    });
  })
);

/**
 * @swagger
 * /levels/experience/history:
 *   get:
 *     summary: Получить историю получения опыта
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: История опыта
 */
router.get('/experience/history',
  auth,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const ExperienceHistory = require('../models/ExperienceHistory');
    const [history, total] = await Promise.all([
      ExperienceHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select('-__v'),
      ExperienceHistory.countDocuments({ userId: req.user.id })
    ]);
    res.json({
      success: true,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      history
    });
  })
);

/**
 * @swagger
 * /levels/leaderboard/top:
 *   get:
 *     summary: Получить топ пользователей по уровню/опыту
 *     tags: [Levels]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [level, experience]
 *           default: level
 *     responses:
 *       200:
 *         description: Лидерборд
 */
router.get('/leaderboard/top',
  catchAsync(async (req, res) => {
    const { limit = 10, sortBy = 'level' } = req.query;
    const sortField = sortBy === 'experience' ? 'experiencePoints' : 'level';
    const leaderboard = await User.find()
      .sort({ [sortField]: -1, experiencePoints: -1, createdAt: 1 })
      .limit(parseInt(limit))
      .select('name email level experiencePoints totalAchievementPoints createdAt');
    const leaderboardWithRank = leaderboard.map((user, index) => ({ rank: index + 1, ...user.toObject() }));
    res.json({ success: true, leaderboard: leaderboardWithRank });
  })
);

/**
 * @swagger
 * /levels/leaderboard/my-position:
 *   get:
 *     summary: Получить позицию текущего пользователя в лидерборде
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Позиция пользователя
 */
router.get('/leaderboard/my-position',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('level experiencePoints');
    if (!user) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

    const usersAboveByLevel = await User.countDocuments({ level: { $gt: user.level } });
    const usersAboveByExperience = await User.countDocuments({ experiencePoints: { $gt: user.experiencePoints } });
    const totalUsers = await User.countDocuments();

    res.json({
      success: true,
      position: {
        byLevel: usersAboveByLevel + 1,
        byExperience: usersAboveByExperience + 1,
        totalUsers
      },
      stats: {
        level: user.level,
        experiencePoints: user.experiencePoints,
        percentileByLevel: totalUsers > 0 ? Math.round(((usersAboveByLevel + 1) / totalUsers) * 100) : 100,
        percentileByExperience: totalUsers > 0 ? Math.round(((usersAboveByExperience + 1) / totalUsers) * 100) : 100
      }
    });
  })
);

/**
 * @swagger
 * /levels/stats/overview:
 *   get:
 *     summary: Получить общую статистику по уровням
 *     tags: [Levels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика
 */
router.get('/stats/overview',
  auth,
  catchAsync(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const avgLevel = await User.aggregate([{ $group: { _id: null, avg: { $avg: '$level' } } }]);
    const avgExp = await User.aggregate([{ $group: { _id: null, avg: { $avg: '$experiencePoints' } } }]);
    const distribution = await User.aggregate([{ $group: { _id: '$level', count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 10 }]);
    const topLevelUser = await User.findOne().sort({ level: -1, experiencePoints: -1 }).select('name level experiencePoints');
    const topExpUser = await User.findOne().sort({ experiencePoints: -1, level: -1 }).select('name level experiencePoints');

    res.json({
      success: true,
      stats: {
        totalUsers,
        averageLevel: avgLevel[0]?.avg || 0,
        averageExperience: avgExp[0]?.avg || 0,
        levelDistribution: distribution,
        topLevelUser: topLevelUser || null,
        topExperienceUser: topExpUser || null
      }
    });
  })
);

module.exports = router;