// server/routes/badges.js

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const { auth } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение бейджей пользователя для отображения в профиле
router.get('/my-badges',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Получаем отображаемые бейджи
    const displayedBadges = await user.getDisplayedBadges();
    
    // Получаем все разблокированные достижения для статистики
    const UserAchievement = require('../models/UserAchievement');
    const unlockedAchievements = await UserAchievement.find({
      userId: user._id,
      isUnlocked: true
    }).populate('achievementId');
    
    // Подготавливаем данные для ответа
    const badges = unlockedAchievements.map(ua => ({
      id: ua.achievementId._id,
      code: ua.achievementId.code,
      name: ua.achievementId.name,
      description: ua.achievementId.description,
      icon: ua.achievementId.icon,
      category: ua.achievementId.category,
      difficulty: ua.achievementId.difficulty,
      difficultyColor: ua.achievementId.difficultyColor,
      points: ua.achievementId.points,
      unlockedAt: ua.unlockedAt,
      isDisplayed: displayedBadges.some(badge => 
        badge.achievementId.toString() === ua.achievementId._id.toString()
      )
    }));
    
    // Группируем по категориям
    const badgesByCategory = {
      study: badges.filter(b => b.category === 'study'),
      group: badges.filter(b => b.category === 'group'),
      flashcard: badges.filter(b => b.category === 'flashcard'),
      note: badges.filter(b => b.category === 'note'),
      social: badges.filter(b => b.category === 'social'),
      system: badges.filter(b => b.category === 'system')
    };
    
    res.json({
      success: true,
      badges: {
        displayed: displayedBadges,
        all: badges,
        byCategory: badgesByCategory,
        stats: {
          total: badges.length,
          displayedCount: displayedBadges.length,
          byDifficulty: {
            bronze: badges.filter(b => b.difficulty === 'bronze').length,
            silver: badges.filter(b => b.difficulty === 'silver').length,
            gold: badges.filter(b => b.difficulty === 'gold').length,
            platinum: badges.filter(b => b.difficulty === 'platinum').length
          }
        }
      }
    });
  })
);

// Добавление бейджа в отображаемые
router.post('/display-badge',
  auth,
  catchAsync(async (req, res) => {
    const { achievementId, position } = req.body;
    
    if (!achievementId) {
      return res.status(400).json({
        success: false,
        error: 'ID достижения обязательно'
      });
    }
    
    const user = await User.findById(req.user.id);
    const achievement = await Achievement.findById(achievementId);
    
    if (!user || !achievement) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь или достижение не найдено'
      });
    }
    
    // Проверяем, разблокировано ли достижение у пользователя
    const UserAchievement = require('../models/UserAchievement');
    const userAchievement = await UserAchievement.findOne({
      userId: user._id,
      achievementId: achievement._id,
      isUnlocked: true
    });
    
    if (!userAchievement) {
      return res.status(400).json({
        success: false,
        error: 'Это достижение еще не разблокировано'
      });
    }
    
    // Добавляем бейдж в отображаемые
    await user.addDisplayedBadge(achievement._id, position);
    
    res.json({
      success: true,
      message: 'Бейдж добавлен в отображаемые'
    });
  })
);

// Удаление бейджа из отображаемых
router.delete('/remove-displayed-badge/:achievementId',
  auth,
  catchAsync(async (req, res) => {
    const { achievementId } = req.params;
    
    if (!achievementId) {
      return res.status(400).json({
        success: false,
        error: 'ID достижения обязательно'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Удаляем бейдж из отображаемых
    await user.removeDisplayedBadge(achievementId);
    
    res.json({
      success: true,
      message: 'Бейдж удален из отображаемых'
    });
  })
);

// Обновление порядка отображения бейджей
router.put('/reorder-badges',
  auth,
  catchAsync(async (req, res) => {
    const { badgesOrder } = req.body;
    
    if (!badgesOrder || !Array.isArray(badgesOrder)) {
      return res.status(400).json({
        success: false,
        error: 'Порядок бейджей должен быть массивом'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Обновляем порядок бейджей
    user.badges.displayedBadges = badgesOrder.map((achievementId, index) => ({
      achievementId,
      position: index + 1
    }));
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Порядок бейджей обновлен'
    });
  })
);

// Получение серии (streak) пользователя
router.get('/streak',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('streaks');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      streak: user.streaks
    });
  })
);

// Обновление серии (при активности пользователя)
router.post('/update-streak',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    const updatedStreak = await user.updateStreak();
    
    res.json({
      success: true,
      streak: updatedStreak,
      message: 'Серия обновлена'
    });
  })
);

// Получение статистики достижений пользователя
router.get('/stats',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Обновляем статистику
    const stats = await user.updateAchievementStats();
    
    res.json({
      success: true,
      stats
    });
  })
);

module.exports = router;