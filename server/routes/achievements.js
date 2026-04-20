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

// Получение всех достижений (публичные)
router.get('/',
  auth,
  [
    query('category')
      .optional()
      .isIn(['study', 'group', 'flashcard', 'note', 'social', 'system', 'all'])
      .withMessage('Недопустимая категория'),
    
    query('difficulty')
      .optional()
      .isIn(['bronze', 'silver', 'gold', 'platinum', 'all'])
      .withMessage('Недопустимая сложность'),
    
    query('unlocked')
      .optional()
      .isIn(['true', 'false', 'all']).withMessage('Параметр unlocked должен быть: true, false или all'),
    
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Номер страницы должен быть положительным числом'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100')
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

    // Фильтр для достижений
    const filter = { isActive: true };
    
    if (category !== 'all') {
      filter.category = category;
    }
    
    if (difficulty !== 'all') {
      filter.difficulty = difficulty;
    }

    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ sortOrder: 1, difficulty: 1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Achievement.countDocuments(filter)
    ]);

    // Объединяем достижения с прогрессом пользователя
    const achievementsWithProgress = achievements.map(achievement => {
      const userAchievement = userAchievementMap[achievement._id.toString()] || {
        progress: 0,
        isUnlocked: false,
        unlockedAt: null
      };
      
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
        secret: achievement.secret && !userAchievement.isUnlocked,
        progress: userAchievement.progress,
        isUnlocked: userAchievement.isUnlocked,
        unlockedAt: userAchievement.unlockedAt,
        createdAt: achievement.createdAt
      };
    });

    // Фильтруем по разблокированным если нужно
    let filteredAchievements = achievementsWithProgress;
    if (unlocked !== 'all') {
      filteredAchievements = achievementsWithProgress.filter(
        a => unlocked === 'true' ? a.isUnlocked : !a.isUnlocked
      );
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

// Получение достижений пользователя
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

// Получение прогресса пользователя
router.get('/progress',
  auth,
  catchAsync(async (req, res) => {
    const progress = await UserAchievement.getUserProgress(req.user.id);

    res.json({
      success: true,
      progress
    });
  })
);

// Получение конкретного достижения
router.get('/:id',
  auth,
  idValidation,
  catchAsync(async (req, res) => {
    const achievement = await Achievement.findById(req.params.id).select('-__v');
    
    if (!achievement) {
      throw new AppError('Достижение не найдено', 404);
    }

    // Получаем прогресс пользователя
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

    res.json({
      success: true,
      achievement: achievementWithProgress
    });
  })
);

// Проверка и обновление прогресса достижения
router.post('/check/:achievementCode',
  auth,
  [
    param('achievementCode')
      .trim()
      .notEmpty().withMessage('Код достижения обязателен')
      .isLength({ min: 3, max: 50 }).withMessage('Код должен быть от 3 до 50 символов')
  ],
  catchAsync(async (req, res) => {
    const { progress = 1 } = req.body;
    
    const userAchievement = await Achievement.checkAchievement(
      req.user.id,
      req.params.achievementCode,
      progress
    );

    const populatedUserAchievement = await UserAchievement.findById(userAchievement._id)
      .populate('achievementId')
      .select('-__v');

    res.json({
      success: true,
      message: 'Прогресс достижения обновлен',
      userAchievement: {
        id: populatedUserAchievement._id,
        achievement: {
          id: populatedUserAchievement.achievementId._id,
          code: populatedUserAchievement.achievementId.code,
          name: populatedUserAchievement.achievementId.name,
          description: populatedUserAchievement.achievementId.description,
          icon: populatedUserAchievement.achievementId.icon,
          category: populatedUserAchievement.achievementId.category,
          difficulty: populatedUserAchievement.achievementId.difficulty,
          points: populatedUserAchievement.achievementId.points
        },
        progress: populatedUserAchievement.progress,
        isUnlocked: populatedUserAchievement.isUnlocked,
        unlockedAt: populatedUserAchievement.unlockedAt,
        notified: populatedUserAchievement.notified
      }
    });
  })
);

// Получение рейтинга пользователей по достижениям
router.get('/leaderboard/top',
  auth,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Лимит должен быть от 1 до 100'),
    
    query('category')
      .optional()
      .isIn(['study', 'group', 'flashcard', 'note', 'social', 'system', 'all'])
      .withMessage('Недопустимая категория')
  ],
  catchAsync(async (req, res) => {
    const { limit = 10, category = 'all' } = req.query;
    
    const matchStage = {};
    if (category !== 'all') {
      matchStage['achievement.category'] = category;
    }
    
    const leaderboard = await UserAchievement.aggregate([
      {
        $lookup: {
          from: 'achievements',
          localField: 'achievementId',
          foreignField: '_id',
          as: 'achievement'
        }
      },
      {
        $unwind: '$achievement'
      },
      {
        $match: {
          ...matchStage,
          isUnlocked: true
        }
      },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$achievement.points' },
          unlockedCount: { $sum: 1 },
          lastUnlock: { $max: '$unlockedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          userId: '$_id',
          userName: '$user.name',
          userAvatar: '$user.avatarUrl',
          totalPoints: 1,
          unlockedCount: 1,
          lastUnlock: 1
        }
      },
      {
        $sort: { totalPoints: -1, unlockedCount: -1, lastUnlock: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Добавляем позицию в рейтинге
    const leaderboardWithRank = leaderboard.map((item, index) => ({
      rank: index + 1,
      ...item
    }));

    res.json({
      success: true,
      leaderboard: leaderboardWithRank
    });
  })
);

// Получение позиции текущего пользователя в рейтинге
router.get('/leaderboard/my-position',
  auth,
  catchAsync(async (req, res) => {
    const allUsers = await UserAchievement.aggregate([
      {
        $lookup: {
          from: 'achievements',
          localField: 'achievementId',
          foreignField: '_id',
          as: 'achievement'
        }
      },
      {
        $unwind: '$achievement'
      },
      {
        $match: {
          isUnlocked: true
        }
      },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$achievement.points' },
          unlockedCount: { $sum: 1 },
          lastUnlock: { $max: '$unlockedAt' }
        }
      },
      {
        $sort: { totalPoints: -1, unlockedCount: -1, lastUnlock: -1 }
      }
    ]);

    // Находим позицию текущего пользователя
    const userPosition = allUsers.findIndex(
      user => user._id.toString() === req.user.id.toString()
    );

    const userData = allUsers[userPosition] || {
      totalPoints: 0,
      unlockedCount: 0,
      lastUnlock: null
    };

    res.json({
      success: true,
      position: userPosition !== -1 ? userPosition + 1 : allUsers.length + 1,
      totalUsers: allUsers.length,
      userStats: {
        totalPoints: userData.totalPoints,
        unlockedCount: userData.unlockedCount,
        lastUnlock: userData.lastUnlock
      }
    });
  })
);

// Получение следующих достижений для пользователя (рекомендации)
router.get('/recommendations/next',
  auth,
  catchAsync(async (req, res) => {
    // Получаем все активные достижения
    const allAchievements = await Achievement.find({ isActive: true })
      .sort({ sortOrder: 1, points: 1 })
      .select('-__v');

    // Получаем достижения пользователя
    const userAchievements = await UserAchievement.find({ userId: req.user.id });
    const unlockedAchievementIds = userAchievements
      .filter(ua => ua.isUnlocked)
      .map(ua => ua.achievementId.toString());

    // Фильтруем незаблокированные достижения
    const availableAchievements = allAchievements.filter(
      achievement => !unlockedAchievementIds.includes(achievement._id.toString())
    );

    // Рекомендуем достижения по категориям, где у пользователя мало прогресса
    const userProgressByCategory = {};
    userAchievements.forEach(ua => {
      const achievement = allAchievements.find(a => a._id.equals(ua.achievementId));
      if (achievement) {
        if (!userProgressByCategory[achievement.category]) {
          userProgressByCategory[achievement.category] = {
            unlocked: 0,
            total: 0
          };
        }
        userProgressByCategory[achievement.category].total++;
        if (ua.isUnlocked) {
          userProgressByCategory[achievement.category].unlocked++;
        }
      }
    });

    // Сортируем достижения по приоритету
    const recommendedAchievements = availableAchievements
      .map(achievement => {
        const userProgress = userProgressByCategory[achievement.category] || { unlocked: 0, total: 0 };
        const categoryProgress = userProgress.total > 0 
          ? (userProgress.unlocked / userProgress.total) * 100 
          : 0;
        
        // Чем меньше прогресс в категории, тем выше приоритет
        const priority = 100 - categoryProgress + achievement.sortOrder;
        
        return {
          ...achievement.toObject(),
          priority
        };
      })
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5) // Топ 5 рекомендаций
      .map((achievement, index) => ({
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
        priority: index + 1
      }));

    res.json({
      success: true,
      count: recommendedAchievements.length,
      recommendations: recommendedAchievements
    });
  })
);

// Сброс прогресса достижения (для тестирования)
router.delete('/reset/:achievementCode',
  auth,
  [
    param('achievementCode')
      .trim()
      .notEmpty().withMessage('Код достижения обязателен')
      .isLength({ min: 3, max: 50 }).withMessage('Код должен быть от 3 до 50 символов')
  ],
  catchAsync(async (req, res) => {
    const achievement = await Achievement.findOne({ code: req.params.achievementCode });
    
    if (!achievement) {
      throw new AppError('Достижение не найдено', 404);
    }

    await UserAchievement.findOneAndDelete({
      userId: req.user.id,
      achievementId: achievement._id
    });

    res.json({
      success: true,
      message: 'Прогресс достижения сброшен'
    });
  })
);

module.exports = router;

