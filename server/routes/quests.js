// server/routes/quests.js

const express = require('express');
const mongoose = require('mongoose');
const Quest = require('../models/Quest');
const UserQuest = require('../models/UserQuest');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение всех активных заданий
router.get('/',
  auth,
  catchAsync(async (req, res) => {
    const { type, category, difficulty } = req.query;
    
    const filter = { isActive: true };
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }
    
    const quests = await Quest.find(filter)
      .sort({ type: 1, sortOrder: 1, createdAt: 1 })
      .select('-__v');
    
    res.json({
      success: true,
      count: quests.length,
      quests
    });
  })
);

// Получение заданий текущего пользователя
router.get('/my-quests',
  auth,
  catchAsync(async (req, res) => {
    const userQuests = await UserQuest.getUserQuests(req.user.id);
    
    res.json({
      success: true,
      count: userQuests.length,
      quests: userQuests
    });
  })
);

// Получение конкретного задания
router.get('/:questId',
  auth,
  catchAsync(async (req, res) => {
    const quest = await Quest.findById(req.params.questId).select('-__v');
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        error: 'Задание не найдено'
      });
    }
    
    // Получаем прогресс пользователя по этому заданию
    const userQuest = await UserQuest.findOne({
      userId: req.user.id,
      questId: quest._id
    });
    
    const questWithProgress = {
      ...quest.toObject(),
      userProgress: userQuest || null
    };
    
    res.json({
      success: true,
      quest: questWithProgress
    });
  })
);

// Обновление прогресса задания
router.post('/update-progress/:questCode',
  auth,
  catchAsync(async (req, res) => {
    const { questCode } = req.params;
    const { progress = 1 } = req.body;
    
    const userQuest = await UserQuest.updateQuestProgress(
      req.user.id,
      questCode,
      progress
    );
    
    // Если задание выполнено, добавляем награды пользователю
    if (userQuest.isCompleted && !userQuest.claimed) {
      const quest = await Quest.findById(userQuest.questId);
      const user = await User.findById(req.user.id);
      
      if (quest && user) {
        // Добавляем опыт
        if (quest.rewards.experience > 0) {
          await user.addExperience(quest.rewards.experience, `Задание: ${quest.name}`);
        }
        
        // Добавляем достижение, если есть
        if (quest.rewards.achievementId) {
          const Achievement = require('../models/Achievement');
          await Achievement.checkAchievement(
            req.user.id,
            quest.rewards.achievementId
          );
        }
        
        // Можно добавить другие награды (монеты, предметы и т.д.)
      }
    }
    
    res.json({
      success: true,
      message: 'Прогресс задания обновлен',
      userQuest
    });
  })
);

// Завершение задания и получение наград
router.post('/claim/:userQuestId',
  auth,
  catchAsync(async (req, res) => {
    const userQuest = await UserQuest.findOne({
      _id: req.params.userQuestId,
      userId: req.user.id
    }).populate('questId');
    
    if (!userQuest) {
      return res.status(404).json({
        success: false,
        error: 'Задание пользователя не найдено'
      });
    }
    
    if (!userQuest.isCompleted) {
      return res.status(400).json({
        success: false,
        error: 'Задание еще не выполнено'
      });
    }
    
    if (userQuest.claimed) {
      return res.status(400).json({
        success: false,
        error: 'Награда уже получена'
      });
    }
    
    // Отмечаем награду как полученную
    userQuest.claimed = true;
    userQuest.claimedAt = new Date();
    await userQuest.save();
    
    const quest = userQuest.questId;
    const user = await User.findById(req.user.id);
    
    // Начисляем награды
    let rewards = {
      experience: 0,
      achievements: []
    };
    
    if (quest.rewards.experience > 0) {
      await user.addExperience(quest.rewards.experience, `Награда за задание: ${quest.name}`);
      rewards.experience = quest.rewards.experience;
    }
    
    if (quest.rewards.achievementId) {
      const Achievement = require('../models/Achievement');
      const userAchievement = await Achievement.checkAchievement(
        req.user.id,
        quest.rewards.achievementId
      );
      
      if (userAchievement) {
        rewards.achievements.push({
          id: quest.rewards.achievementId,
          name: quest.name
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Награды получены',
      rewards,
      userQuest
    });
  })
);

// Получение статистики по заданиям
router.get('/stats/my',
  auth,
  catchAsync(async (req, res) => {
    const stats = await UserQuest.getQuestStats(req.user.id);
    
    res.json({
      success: true,
      stats
    });
  })
);

// Генерация ежедневных заданий
router.post('/generate-daily',
  auth,
  catchAsync(async (req, res) => {
    const dailyQuests = await Quest.generateDailyQuests(req.user.id);
    
    // Создаем записи о заданиях для пользователя
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const createdQuests = [];
    
    for (const questData of dailyQuests) {
      // Проверяем, существует ли уже такое задание
      let quest = await Quest.findOne({ code: questData.code });
      
      if (!quest) {
        // Создаем новое задание
        quest = new Quest({
          ...questData,
          expiresAt: tomorrow
        });
        await quest.save();
      }
      
      // Создаем запись для пользователя
      const userQuest = new UserQuest({
        userId: req.user.id,
        questId: quest._id,
        progress: 0,
        requiredProgress: questData.requirements.count || 1,
        expiresAt: tomorrow
      });
      
      await userQuest.save();
      createdQuests.push(userQuest);
    }
    
    res.json({
      success: true,
      message: 'Ежедневные задания сгенерированы',
      count: createdQuests.length,
      quests: createdQuests
    });
  })
);

module.exports = router;