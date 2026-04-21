// server/routes/achievements.js
const { query, param } = require('express-validator');
const express = require('express');
const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const { auth } = require('../middleware/auth');
const { 
  idValidation,
  sanitizeInput 
} = require('../middleware/validation');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Achievements
 *   description: Управление достижениями пользователей
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Achievement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         icon:
 *           type: string
 *         category:
 *           type: string
 *           enum: [study, group, flashcard, note, social, system]
 *         difficulty:
 *           type: string
 *           enum: [bronze, silver, gold, platinum]
 *         difficultyClass:
 *           type: string
 *         difficultyColor:
 *           type: string
 *         points:
 *           type: number
 *         requirements:
 *           type: object
 *         secret:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         sortOrder:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserAchievement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         achievementId:
 *           $ref: '#/components/schemas/Achievement'
 *         progress:
 *           type: number
 *         isUnlocked:
 *           type: boolean
 *         unlockedAt:
 *           type: string
 *           format: date-time
 *         notified:
 *           type: boolean
 */

/**
 * @swagger
 * /achievements:
 *   get:
 *     summary: Получить все доступные достижения
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [study, group, flashcard, note, social, system, all]
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [bronze, silver, gold, platinum, all]
 *       - in: query
 *         name: unlocked
 *         schema:
 *           type: string
 *           enum: [true, false, all]
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
 *         description: Список достижений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 pagination:
 *                   type: object
 *                 count:
 *                   type: integer
 *                 achievements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Achievement'
 */
router.get('/',
  auth,
  [
    query('category').optional().isIn(['study', 'group', 'flashcard', 'note', 'social', 'system', 'all']),
    query('difficulty').optional().isIn(['bronze', 'silver', 'gold', 'platinum', 'all']),
    query('unlocked').optional().isIn(['true', 'false', 'all']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  catchAsync(async (req, res) => {
    const { 
      category = 'all',
      difficulty = 'all',
      unlocked = 'all',
      page = 1,
      limit = 20
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Получаем все достижения пользователя
    const userAchievements = await UserAchievement.find({ userId: req.user.id })
      .populate('achievementId')
      .lean();

    const userAchievementMap = {};
    userAchievements.forEach(ua => {
      if (ua.achievementId) {
        userAchievementMap[ua.achievementId._id.toString()] = {
          progress: ua.progress,
          isUnlocked: ua.isUnlocked,
          unlockedAt: ua.unlockedAt
        };
      }
    });

    const filter = { isActive: true };
    if (category !== 'all') filter.category = category;
    if (difficulty !== 'all') filter.difficulty = difficulty;

    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ sortOrder: 1, difficulty: 1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Achievement.countDocuments(filter)
    ]);

    const achievementsWithProgress = achievements.map(achievement => {
      const ua = userAchievementMap[achievement._id.toString()] || { progress: 0, isUnlocked: false, unlockedAt: null };
      return {
        id: achievement._id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        difficulty: achievement.difficulty,
        difficultyClass: achievement.difficultyClass,
        difficultyColor: achievement.difficultyColor,
        points: achievement.points,
        requirements: achievement.requirements,
        secret: achievement.secret && !ua.isUnlocked,
        progress: ua.progress,
        isUnlocked: ua.isUnlocked,
        unlockedAt: ua.unlockedAt,
        createdAt: achievement.createdAt
      };
    });

    let filteredAchievements = achievementsWithProgress;
    if (unlocked !== 'all') {
      filteredAchievements = achievementsWithProgress.filter(a => unlocked === 'true' ? a.isUnlocked : !a.isUnlocked);
    }

    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      count: filteredAchievements.length,
      achievements: filteredAchievements
    });
  })
);

/**
 * @swagger
 * /achievements/my:
 *   get:
 *     summary: Получить достижения текущего пользователя
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список достижений пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 achievements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserAchievement'
 */
router.get('/my',
  auth,
  catchAsync(async (req, res) => {
    const userAchievements = await UserAchievement.find({ userId: req.user.id })
      .populate('achievementId')
      .sort({ unlockedAt: -1, createdAt: -1 })
      .select('-__v');

    const achievements = userAchievements.map(ua => ({
      id: ua._id,
      achievement: {
        id: ua.achievementId._id,
        code: ua.achievementId.code,
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        icon: ua.achievementId.icon,
        category: ua.achievementId.category,
        difficulty: ua.achievementId.difficulty,
        difficultyClass: ua.achievementId.difficultyClass,
        difficultyColor: ua.achievementId.difficultyColor,
        points: ua.achievementId.points
      },
      progress: ua.progress,
      isUnlocked: ua.isUnlocked,
      unlockedAt: ua.unlockedAt,
      notified: ua.notified,
      createdAt: ua.createdAt,
      updatedAt: ua.updatedAt
    }));

    res.json({
      success: true,
      count: achievements.length,
      achievements
    });
  })
);

/**
 * @swagger
 * /achievements/progress:
 *   get:
 *     summary: Получить общий прогресс пользователя по достижениям
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика прогресса
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   type: object
 */
router.get('/progress',
  auth,
  catchAsync(async (req, res) => {
    const progress = await UserAchievement.getUserProgress(req.user.id);
    res.json({ success: true, progress });
  })
);

/**
 * @swagger
 * /achievements/{id}:
 *   get:
 *     summary: Получить информацию о конкретном достижении
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID достижения
 *     responses:
 *       200:
 *         description: Данные достижения
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 achievement:
 *                   $ref: '#/components/schemas/Achievement'
 *       404:
 *         description: Достижение не найдено
 */
router.get('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const achievement = await Achievement.findById(req.params.id).select('-__v');
    if (!achievement) throw new AppError('Достижение не найдено', 404);

    const userAchievement = await UserAchievement.findOne({
      userId: req.user.id,
      achievementId: achievement._id
    });

    const achievementWithProgress = {
      id: achievement._id,
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      category: achievement.category,
      difficulty: achievement.difficulty,
      difficultyClass: achievement.difficultyClass,
      difficultyColor: achievement.difficultyColor,
      points: achievement.points,
      requirements: achievement.requirements,
      secret: achievement.secret && !(userAchievement?.isUnlocked),
      progress: userAchievement?.progress || 0,
      isUnlocked: userAchievement?.isUnlocked || false,
      unlockedAt: userAchievement?.unlockedAt || null,
      createdAt: achievement.createdAt,
      updatedAt: achievement.updatedAt
    };

    res.json({ success: true, achievement: achievementWithProgress });
  })
);

/**
 * @swagger
 * /achievements/check/{achievementCode}:
 *   post:
 *     summary: Проверить и обновить прогресс достижения
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Код достижения
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               progress:
 *                 type: number
 *                 default: 1
 *     responses:
 *       200:
 *         description: Прогресс обновлён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 userAchievement:
 *                   $ref: '#/components/schemas/UserAchievement'
 */
router.post('/check/:achievementCode',
  auth,
  [
    param('achievementCode').trim().notEmpty().isLength({ min: 3, max: 50 })
  ],
  catchAsync(async (req, res) => {
    const { progress = 1 } = req.body;
    const userAchievement = await Achievement.checkAchievement(req.user.id, req.params.achievementCode, progress);
    const populated = await UserAchievement.findById(userAchievement._id).populate('achievementId').select('-__v');

    res.json({
      success: true,
      message: 'Прогресс достижения обновлен',
      userAchievement: {
        id: populated._id,
        achievement: {
          id: populated.achievementId._id,
          code: populated.achievementId.code,
          name: populated.achievementId.name,
          description: populated.achievementId.description,
          icon: populated.achievementId.icon,
          category: populated.achievementId.category,
          difficulty: populated.achievementId.difficulty,
          points: populated.achievementId.points
        },
        progress: populated.progress,
        isUnlocked: populated.isUnlocked,
        unlockedAt: populated.unlockedAt,
        notified: populated.notified
      }
    });
  })
);

/**
 * @swagger
 * /achievements/leaderboard/top:
 *   get:
 *     summary: Получить топ пользователей по очкам достижений
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [study, group, flashcard, note, social, system, all]
 *     responses:
 *       200:
 *         description: Рейтинг пользователей
 */
router.get('/leaderboard/top',
  auth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(['study', 'group', 'flashcard', 'note', 'social', 'system', 'all'])
  ],
  catchAsync(async (req, res) => {
    const { limit = 10, category = 'all' } = req.query;
    const matchStage = category !== 'all' ? { 'achievement.category': category } : {};

    const leaderboard = await UserAchievement.aggregate([
      { $lookup: { from: 'achievements', localField: 'achievementId', foreignField: '_id', as: 'achievement' } },
      { $unwind: '$achievement' },
      { $match: { ...matchStage, isUnlocked: true } },
      { $group: { _id: '$userId', totalPoints: { $sum: '$achievement.points' }, unlockedCount: { $sum: 1 }, lastUnlock: { $max: '$unlockedAt' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, userId: '$_id', userName: '$user.name', userAvatar: '$user.avatarUrl', totalPoints: 1, unlockedCount: 1, lastUnlock: 1 } },
      { $sort: { totalPoints: -1, unlockedCount: -1, lastUnlock: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const leaderboardWithRank = leaderboard.map((item, index) => ({ rank: index + 1, ...item }));
    res.json({ success: true, leaderboard: leaderboardWithRank });
  })
);

/**
 * @swagger
 * /achievements/leaderboard/my-position:
 *   get:
 *     summary: Получить позицию текущего пользователя в рейтинге
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Позиция пользователя
 */
router.get('/leaderboard/my-position',
  auth,
  catchAsync(async (req, res) => {
    const allUsers = await UserAchievement.aggregate([
      { $lookup: { from: 'achievements', localField: 'achievementId', foreignField: '_id', as: 'achievement' } },
      { $unwind: '$achievement' },
      { $match: { isUnlocked: true } },
      { $group: { _id: '$userId', totalPoints: { $sum: '$achievement.points' }, unlockedCount: { $sum: 1 }, lastUnlock: { $max: '$unlockedAt' } } },
      { $sort: { totalPoints: -1, unlockedCount: -1, lastUnlock: -1 } }
    ]);

    const userPosition = allUsers.findIndex(user => user._id.toString() === req.user.id.toString());
    const userData = allUsers[userPosition] || { totalPoints: 0, unlockedCount: 0, lastUnlock: null };

    res.json({
      success: true,
      position: userPosition !== -1 ? userPosition + 1 : allUsers.length + 1,
      totalUsers: allUsers.length,
      userStats: { totalPoints: userData.totalPoints, unlockedCount: userData.unlockedCount, lastUnlock: userData.lastUnlock }
    });
  })
);

/**
 * @swagger
 * /achievements/recommendations/next:
 *   get:
 *     summary: Получить рекомендуемые достижения для пользователя
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список рекомендаций
 */
router.get('/recommendations/next',
  auth,
  catchAsync(async (req, res) => {
    const allAchievements = await Achievement.find({ isActive: true }).sort({ sortOrder: 1, points: 1 }).select('-__v');
    const userAchievements = await UserAchievement.find({ userId: req.user.id });
    const unlockedIds = userAchievements.filter(ua => ua.isUnlocked).map(ua => ua.achievementId.toString());

    const available = allAchievements.filter(a => !unlockedIds.includes(a._id.toString()));
    const userProgressByCategory = {};
    userAchievements.forEach(ua => {
      const ach = allAchievements.find(a => a._id.equals(ua.achievementId));
      if (ach) {
        if (!userProgressByCategory[ach.category]) userProgressByCategory[ach.category] = { unlocked: 0, total: 0 };
        userProgressByCategory[ach.category].total++;
        if (ua.isUnlocked) userProgressByCategory[ach.category].unlocked++;
      }
    });

    const recommended = available
      .map(ach => {
        const prog = userProgressByCategory[ach.category] || { unlocked: 0, total: 0 };
        const categoryProgress = prog.total > 0 ? (prog.unlocked / prog.total) * 100 : 0;
        const priority = 100 - categoryProgress + ach.sortOrder;
        return { ...ach.toObject(), priority };
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
      .map((ach, idx) => ({
        id: ach._id,
        code: ach.code,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        difficulty: ach.difficulty,
        difficultyClass: ach.difficultyClass,
        difficultyColor: ach.difficultyColor,
        points: ach.points,
        requirements: ach.requirements,
        priority: idx + 1
      }));

    res.json({ success: true, count: recommended.length, recommendations: recommended });
  })
);

/**
 * @swagger
 * /achievements/reset/{achievementCode}:
 *   delete:
 *     summary: Сбросить прогресс достижения (для тестирования)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: achievementCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Код достижения
 *     responses:
 *       200:
 *         description: Прогресс сброшен
 */
router.delete('/reset/:achievementCode',
  auth,
  [
    param('achievementCode').trim().notEmpty().isLength({ min: 3, max: 50 })
  ],
  catchAsync(async (req, res) => {
    const achievement = await Achievement.findOne({ code: req.params.achievementCode });
    if (!achievement) throw new AppError('Достижение не найдено', 404);

    await UserAchievement.findOneAndDelete({ userId: req.user.id, achievementId: achievement._id });
    res.json({ success: true, message: 'Прогресс достижения сброшен' });
  })
);

module.exports = router;