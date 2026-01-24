// server/routes/rewards.js

const express = require('express');
const User = require('../models/User');
const UserLevel = require('../models/UserLevel');
const { auth } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение всех доступных наград
router.get('/available',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('rewards level');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Получаем все уровни для информации о наградах
    const levels = await UserLevel.find({ isActive: true })
      .sort({ level: 1 })
      .select('level name unlocks');
    
    // Формируем список всех доступных наград
    const availableRewards = {
      themes: [
        { id: 'default', name: 'Стандартная', color: '#6b7280', requiresLevel: 1 },
        { id: 'dark', name: 'Темная', color: '#1f2937', requiresLevel: 5 },
        { id: 'premium', name: 'Премиум', color: '#f59e0b', requiresLevel: 10 },
        { id: 'gradient', name: 'Градиент', color: '#8b5cf6', requiresLevel: 15 },
        { id: 'nebula', name: 'Туманность', color: '#6366f1', requiresLevel: 20 },
        { id: 'sunset', name: 'Закат', color: '#ec4899', requiresLevel: 25 },
        { id: 'forest', name: 'Лес', color: '#10b981', requiresLevel: 30 },
        { id: 'ocean', name: 'Океан', color: '#3b82f6', requiresLevel: 35 }
      ],
      avatarEffects: [
        { id: 'none', name: 'Без эффекта', icon: '👤', requiresLevel: 1 },
        { id: 'sparkle', name: 'Блеск', icon: '✨', requiresLevel: 3 },
        { id: 'glow', name: 'Свечение', icon: '💫', requiresLevel: 5 },
        { id: 'fire', name: 'Огонь', icon: '🔥', requiresLevel: 10 },
        { id: 'halo', name: 'Нимб', icon: '😇', requiresLevel: 15 },
        { id: 'rainbow', name: 'Радуга', icon: '🌈', requiresLevel: 20 },
        { id: 'pulse', name: 'Пульсация', icon: '💓', requiresLevel: 25 }
      ],
      badgeFrames: [
        { id: 'none', name: 'Без рамки', icon: '🖼️', requiresLevel: 1 },
        { id: 'bronze-frame', name: 'Бронзовая рамка', icon: '🥉', requiresLevel: 2 },
        { id: 'silver-frame', name: 'Серебряная рамка', icon: '🥈', requiresLevel: 5 },
        { id: 'gold-frame', name: 'Золотая рамка', icon: '🥇', requiresLevel: 10 },
        { id: 'platinum-frame', name: 'Платиновая рамка', icon: '🏆', requiresLevel: 20 },
        { id: 'crystal-frame', name: 'Кристальная рамка', icon: '💎', requiresLevel: 30 }
      ],
      profileBackgrounds: [
        { id: 'default', name: 'Стандартный', icon: '🎨', requiresLevel: 1 },
        { id: 'particles', name: 'Частицы', icon: '✨', requiresLevel: 10 },
        { id: 'gradient-animated', name: 'Анимированный градиент', icon: '🌊', requiresLevel: 20 },
        { id: 'stars', name: 'Звезды', icon: '⭐', requiresLevel: 25 },
        { id: 'geometric', name: 'Геометрия', icon: '🔶', requiresLevel: 30 }
      ],
      specialAbilities: [
        { id: 'daily_quests', name: 'Ежедневные задания', icon: '📅', requiresLevel: 1 },
        { id: 'weekly_quests', name: 'Еженедельные задания', icon: '📆', requiresLevel: 3 },
        { id: 'monthly_quests', name: 'Ежемесячные задания', icon: '🗓️', requiresLevel: 5 },
        { id: 'custom_themes', name: 'Кастомные темы', icon: '🎨', requiresLevel: 10 },
        { id: 'priority_support', name: 'Приоритетная поддержка', icon: '🚀', requiresLevel: 15 },
        { id: 'advanced_analytics', name: 'Расширенная аналитика', icon: '📊', requiresLevel: 20 },
        { id: 'unlimited_groups', name: 'Неограниченные группы', icon: '👥', requiresLevel: 25 }
      ]
    };
    
    // Добавляем информацию о разблокировке
    Object.keys(availableRewards).forEach(category => {
      availableRewards[category] = availableRewards[category].map(item => ({
        ...item,
        unlocked: user.rewards[`unlocked${category.charAt(0).toUpperCase() + category.slice(1)}`]?.includes(item.id) || false,
        canUnlock: user.level >= item.requiresLevel
      }));
    });
    
    // Получаем активные настройки
    const activeRewards = user.getActiveRewards();
    
    res.json({
      success: true,
      rewards: {
        available: availableRewards,
        unlocked: user.rewards,
        active: activeRewards,
        stats: {
          totalUnlocked: Object.keys(user.rewards).reduce((total, key) => {
            if (Array.isArray(user.rewards[key])) {
              return total + user.rewards[key].length;
            }
            return total;
          }, 0),
          level: user.level
        }
      }
    });
  })
);

// Получение наград пользователя
router.get('/my',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id).select('rewards profileSettings level');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Получаем активные настройки
    const activeRewards = user.getActiveRewards();
    
    res.json({
      success: true,
      rewards: {
        unlocked: user.rewards,
        active: activeRewards,
        stats: {
          totalThemes: user.rewards.unlockedThemes.length,
          totalAvatarEffects: user.rewards.unlockedAvatarEffects.length,
          totalBadgeFrames: user.rewards.unlockedBadgeFrames.length,
          totalSpecialAbilities: user.rewards.unlockedSpecialAbilities.length,
          level: user.level
        }
      }
    });
  })
);

// Применение темы профиля
router.post('/apply-theme',
  auth,
  catchAsync(async (req, res) => {
    const { theme } = req.body;
    
    if (!theme) {
      return res.status(400).json({
        success: false,
        error: 'Тема не указана'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    try {
      await user.applyTheme(theme);
      
      res.json({
        success: true,
        message: 'Тема применена успешно',
        theme
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  })
);

// Применение эффекта аватара
router.post('/apply-avatar-effect',
  auth,
  catchAsync(async (req, res) => {
    const { effect } = req.body;
    
    if (!effect) {
      return res.status(400).json({
        success: false,
        error: 'Эффект не указан'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    try {
      await user.applyAvatarEffect(effect);
      
      res.json({
        success: true,
        message: 'Эффект аватара применен успешно',
        effect
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  })
);

// Применение рамки для бейджей
router.post('/apply-badge-frame',
  auth,
  catchAsync(async (req, res) => {
    const { frame } = req.body;
    
    if (!frame) {
      return res.status(400).json({
        success: false,
        error: 'Рамка не указана'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    try {
      await user.applyBadgeFrame(frame);
      
      res.json({
        success: true,
        message: 'Рамка для бейджей применена успешно',
        frame
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  })
);

// Применение фона профиля
router.post('/apply-profile-background',
  auth,
  catchAsync(async (req, res) => {
    const { background } = req.body;
    
    if (!background) {
      return res.status(400).json({
        success: false,
        error: 'Фон не указан'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    try {
      await user.applyProfileBackground(background);
      
      res.json({
        success: true,
        message: 'Фон профиля применен успешно',
        background
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  })
);

// Получение предпросмотра темы
router.get('/preview-theme/:theme',
  auth,
  catchAsync(async (req, res) => {
    const { theme } = req.params;
    
    const themePreviews = {
      default: {
        primaryColor: '#6b7280',
        secondaryColor: '#f3f4f6',
        textColor: '#1f2937',
        accentColor: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
      },
      dark: {
        primaryColor: '#1f2937',
        secondaryColor: '#374151',
        textColor: '#f9fafb',
        accentColor: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
      },
      premium: {
        primaryColor: '#f59e0b',
        secondaryColor: '#fbbf24',
        textColor: '#78350f',
        accentColor: '#d97706',
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
      },
      gradient: {
        primaryColor: '#8b5cf6',
        secondaryColor: '#ec4899',
        textColor: '#ffffff',
        accentColor: '#6366f1',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
      },
      nebula: {
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        textColor: '#ffffff',
        accentColor: '#a78bfa',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)'
      },
      sunset: {
        primaryColor: '#ec4899',
        secondaryColor: '#f97316',
        textColor: '#ffffff',
        accentColor: '#f59e0b',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)'
      },
      forest: {
        primaryColor: '#10b981',
        secondaryColor: '#059669',
        textColor: '#ffffff',
        accentColor: '#047857',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      ocean: {
        primaryColor: '#3b82f6',
        secondaryColor: '#06b6d4',
        textColor: '#ffffff',
        accentColor: '#0ea5e9',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
      }
    };
    
    const preview = themePreviews[theme] || themePreviews.default;
    
    res.json({
      success: true,
      preview
    });
  })
);

// Получение предпросмотра эффекта аватара
router.get('/preview-avatar-effect/:effect',
  auth,
  catchAsync(async (req, res) => {
    const { effect } = req.params;
    
    const effectPreviews = {
      none: {
        name: 'Без эффекта',
        description: 'Стандартный аватар без эффектов',
        animation: null
      },
      sparkle: {
        name: 'Блеск',
        description: 'Мерцающие частицы вокруг аватара',
        animation: 'sparkle 2s infinite'
      },
      glow: {
        name: 'Свечение',
        description: 'Мягкое свечение вокруг аватара',
        animation: 'glow 3s ease-in-out infinite'
      },
      fire: {
        name: 'Огонь',
        description: 'Анимированное пламя вокруг аватара',
        animation: 'fire 1.5s ease-in-out infinite'
      },
      halo: {
        name: 'Нимб',
        description: 'Светящийся нимб над аватаром',
        animation: 'halo 4s ease-in-out infinite'
      },
      rainbow: {
        name: 'Радуга',
        description: 'Циклическая смена цветов аватара',
        animation: 'rainbow 8s linear infinite'
      },
      pulse: {
        name: 'Пульсация',
        description: 'Пульсирующее свечение аватара',
        animation: 'pulse 2s ease-in-out infinite'
      }
    };
    
    const preview = effectPreviews[effect] || effectPreviews.none;
    
    res.json({
      success: true,
      preview
    });
  })
);

// Сброс всех настроек к значениям по умолчанию
router.post('/reset-defaults',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Сбрасываем настройки к значениям по умолчанию
    user.profileSettings.profileTheme = 'default';
    user.profileSettings.avatarEffect = 'none';
    user.profileSettings.badgeFrame = 'none';
    user.profileSettings.profileBackground = 'default';
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Настройки сброшены к значениям по умолчанию',
      settings: user.profileSettings
    });
  })
);

module.exports = router;