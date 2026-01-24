// server/models/UserLevel.js

const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: [true, 'Уровень обязателен'],
    unique: true,
    min: [1, 'Уровень должен быть не менее 1'],
    max: [100, 'Уровень не должен превышать 100']
  },
  name: {
    type: String,
    required: [true, 'Название уровня обязательно'],
    trim: true,
    minlength: [2, 'Название должно быть не менее 2 символов'],
    maxlength: [50, 'Название не должно превышать 50 символов']
  },
  description: {
    type: String,
    required: [true, 'Описание уровня обязательно'],
    trim: true,
    minlength: [10, 'Описание должно быть не менее 10 символов'],
    maxlength: [200, 'Описание не должно превышать 200 символов']
  },
  requiredPoints: {
    type: Number,
    required: [true, 'Требуемые очки обязательны'],
    min: [0, 'Очки должны быть положительными']
  },
  icon: {
    type: String,
    default: '⭐',
    trim: true,
    maxlength: [10, 'Иконка не должна превышать 10 символов']
  },
  color: {
    type: String,
    default: '#6b7280',
    trim: true
  },
  unlocks: {
    themes: {
      type: [String],
      default: []
    },
    badgeFrames: {
      type: [String],
      default: []
    },
    avatarEffects: {
      type: [String],
      default: []
    },
    specialAbilities: {
      type: [String],
      default: []
    },
    other: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Индексы для оптимизации запросов
levelSchema.index({ level: 1 }, { unique: true });
levelSchema.index({ requiredPoints: 1 });
levelSchema.index({ isActive: 1 });

// Статический метод для получения уровня по очкам
levelSchema.statics.getLevelByPoints = async function(points) {
  const levels = await this.find({ isActive: true })
    .sort({ level: 1 })
    .lean();
  
  let userLevel = levels[0]; // Минимальный уровень по умолчанию
  
  for (const level of levels) {
    if (points >= level.requiredPoints) {
      userLevel = level;
    } else {
      break;
    }
  }
  
  return userLevel;
};

// Статический метод для получения следующего уровня
levelSchema.statics.getNextLevel = async function(currentLevel) {
  const nextLevel = await this.findOne({
    level: currentLevel + 1,
    isActive: true
  }).lean();
  
  return nextLevel;
};

// Статический метод для расчета прогресса до следующего уровня
levelSchema.statics.getProgressToNextLevel = async function(points, currentLevel) {
  const currentLevelData = await this.findOne({ level: currentLevel, isActive: true }).lean();
  const nextLevelData = await this.findOne({ level: currentLevel + 1, isActive: true }).lean();
  
  if (!nextLevelData) {
    return {
      currentLevel: currentLevelData,
      nextLevel: null,
      progressPercentage: 100,
      pointsToNextLevel: 0,
      currentPoints: points
    };
  }
  
  const pointsForCurrentLevel = currentLevelData.requiredPoints;
  const pointsForNextLevel = nextLevelData.requiredPoints;
  const pointsRange = pointsForNextLevel - pointsForCurrentLevel;
  const userPointsInRange = points - pointsForCurrentLevel;
  
  const progressPercentage = Math.min(Math.round((userPointsInRange / pointsRange) * 100), 100);
  const pointsToNextLevel = pointsForNextLevel - points;
  
  return {
    currentLevel: currentLevelData,
    nextLevel: nextLevelData,
    progressPercentage,
    pointsToNextLevel,
    currentPoints: points
  };
};

module.exports = mongoose.model('UserLevel', levelSchema);