// server/routes/levels.js
const { body, param, query } = require('express-validator');
const express = require('express');
const mongoose = require('mongoose');
const UserLevel = require('../models/UserLevel');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение всех уровней
router.get('/',
  catchAsync(async (req, res) => {
    const levels = await UserLevel.find({ isActive: true })
      .sort({ level: 1 })
      .select('-__v -isActive');
    
    res.json({
      success: true,
      count: levels.length,
      levels
    });
  })
);

// Получение уровня по номеру
router.get('/:level',
  catchAsync(async (req, res) => {
    const level = await UserLevel.findOne({ 
      level: req.params.level,
      isActive: true 
    }).select('-__v -isActive');
    
    if (!level) {
      return res.status(404).json({
        success: false,
        error: 'Уровень не найден'
      });
    }
    
    res.json({
      success: true,
      level
    });
  })
);

// Получение прогресса текущего пользователя
router.get('/progress/my',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('level experiencePoints totalAchievementPoints levelProgress');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Получаем детали текущего уровня
    const currentLevel = await UserLevel.findOne({ 
      level: user.level,
      isActive: true 
    }).select('name description icon color unlocks');
    
    // Получаем детали следующего уровня
    const nextLevel = await UserLevel.findOne({ 
      level: user.level + 1,
      isActive: true 
    }).select('name description requiredPoints icon color');
    
    // Получаем историю последних повышений уровня
    const ExperienceHistory = require('../models/ExperienceHistory');
    const recentLevelUps = await ExperienceHistory.find({
      userId: user._id,
      reason: 'level_up'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('points details createdAt');
    
    // Рассчитываем ранг пользователя
    const usersWithMorePoints = await User.countDocuments({
      experiencePoints: { $gt: user.experiencePoints }
    });
    
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
        rank,
        totalUsers,
        percentile,
        recentLevelUps
      }
    });
  })
);

// Получение истории опыта пользователя
router.get('/experience/history',
  auth,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const ExperienceHistory = require('../models/ExperienceHistory');
    
    const [history, total] = await Promise.all([
      ExperienceHistory.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      ExperienceHistory.countDocuments({ userId: req.user.id })
    ]);
    
    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      history
    });
  })
);

// Получение лидерборда по уровням
router.get('/leaderboard/top',
  catchAsync(async (req, res) => {
    const { limit = 10, sortBy = 'level' } = req.query;
    
    const sortField = sortBy === 'experience' ? 'experiencePoints' : 'level';
    
    const leaderboard = await User.find()
      .sort({ [sortField]: -1, experiencePoints: -1, createdAt: 1 })
      .limit(parseInt(limit))
      .select('name email level experiencePoints totalAchievementPoints createdAt');
    
    // Добавляем ранг
    const leaderboardWithRank = leaderboard.map((user, index) => ({
      rank: index + 1,
      ...user.toObject()
    }));
    
    res.json({
      success: true,
      leaderboard: leaderboardWithRank
    });
  })
);

// Получение позиции текущего пользователя в лидерборде
router.get('/leaderboard/my-position',
  auth,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('level experiencePoints');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    // Количество пользователей с более высоким уровнем/опытом
    const usersAboveByLevel = await User.countDocuments({
      level: { $gt: user.level }
    });
    
    const usersAboveByExperience = await User.countDocuments({
      experiencePoints: { $gt: user.experiencePoints }
    });
    
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

// Получение статистики по уровням
router.get('/stats/overview',
  auth,
  catchAsync(async (req, res) => {
    // Общая статистика по уровням
    const totalUsers = await User.countDocuments();
    const averageLevel = await User.aggregate([
      { $group: { _id: null, avgLevel: { $avg: '$level' } } }
    ]);
    
    const averageExperience = await User.aggregate([
      { $group: { _id: null, avgExperience: { $avg: '$experiencePoints' } } }
    ]);
    
    // Распределение по уровням
    const levelDistribution = await User.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 10 }
    ]);
    
    // Самый высокий уровень
    const topLevelUser = await User.findOne()
      .sort({ level: -1, experiencePoints: -1 })
      .select('name level experiencePoints');
    
    // Самый опытный пользователь
    const topExperienceUser = await User.findOne()
      .sort({ experiencePoints: -1, level: -1 })
      .select('name level experiencePoints');
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        averageLevel: averageLevel[0]?.avgLevel || 0,
        averageExperience: averageExperience[0]?.avgExperience || 0,
        levelDistribution,
        topLevelUser: topLevelUser || null,
        topExperienceUser: topExperienceUser || null
      }
    });
  })
);

module.exports = router;