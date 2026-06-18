const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Имя обязательно'],
    trim: true,
    minlength: [2, 'Имя должно быть не менее 2 символов'],
    maxlength: [50, 'Имя не должно превышать 50 символов'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/.test(v);
      },
      message: 'Имя может содержать только буквы, пробелы и дефисы'
    }
  },
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return validator.isEmail(v);
      },
      message: 'Некорректный email адрес'
    }
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен быть не менее 6 символов'],
    select: false,
    validate: {
      validator: function(v) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v);
      },
      message: 'Пароль должен содержать хотя бы одну заглавную букву, одну строчную и одну цифру'
    }
  },
  avatarUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return validator.isURL(v, {
          protocols: ['http', 'https'],
          require_protocol: true
        });
      },
      message: 'Некорректный URL аватара'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'teacher', 'admin'],
      message: 'Роль должна быть: student, teacher или admin'
    },
    default: 'student'
  },
  level: {
    type: Number,
    default: 1,
    min: [1, 'Уровень должен быть не менее 1'],
    max: [100, 'Уровень не должен превышать 100']
  },
  experiencePoints: {
    type: Number,
    default: 0,
    min: [0, 'Опыт не может быть отрицательным']
  },
  totalAchievementPoints: {
    type: Number,
    default: 0,
    min: [0, 'Очки достижений не могут быть отрицательными']
  },
  levelProgress: {
    currentLevel: { type: Number, default: 1 },
    nextLevel: { type: Number, default: 2 },
    progressPercentage: { type: Number, default: 0 },
    pointsToNextLevel: { type: Number, default: 100 },
    lastLevelUp: { type: Date }
  },
  badges: {
    displayedBadges: [{
      achievementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Achievement'
      },
      position: {
        type: Number,
        min: 1,
        max: 6
      }
    }],
    showBadges: {
      type: Boolean,
      default: true
    }
  },
  streaks: {
    current: {
      type: Number,
      default: 0,
      min: 0
    },
    longest: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    },
    streakType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    }
  },
  friends: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  profileSettings: {
    showLevel: { type: Boolean, default: true },
    showAchievements: { type: Boolean, default: true },
    showStreak: { type: Boolean, default: true },
    profileTheme: {
      type: String,
      enum: ['default', 'dark', 'premium', 'gradient', 'nebula', 'sunset', 'forest', 'ocean'],
      default: 'default'
    },
    badgeDisplayMode: { type: String, enum: ['grid', 'list', 'compact'], default: 'grid' },
    avatarEffect: {
      type: String,
      default: 'none',
      enum: ['none', 'sparkle', 'glow', 'fire', 'halo', 'rainbow', 'pulse']
    },
    badgeFrame: {
      type: String,
      default: 'none',
      enum: ['none', 'bronze-frame', 'silver-frame', 'gold-frame', 'platinum-frame', 'crystal-frame']
    },
    profileBackground: {
      type: String,
      default: 'default',
      enum: ['default', 'particles', 'gradient-animated', 'stars', 'geometric']
    },
    specialEffects: { type: [String], default: [] }
  },
  achievementStats: {
    totalUnlocked: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    byCategory: {
      study: { type: Number, default: 0 },
      group: { type: Number, default: 0 },
      flashcard: { type: Number, default: 0 },
      note: { type: Number, default: 0 },
      social: { type: Number, default: 0 },
      system: { type: Number, default: 0 }
    },
    byDifficulty: {
      bronze: { type: Number, default: 0 },
      silver: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      platinum: { type: Number, default: 0 }
    },
    lastAchievementDate: { type: Date }
  },
  rewards: {
    unlockedThemes: { type: [String], default: [] },
    unlockedBadgeFrames: { type: [String], default: [] },
    unlockedAvatarEffects: { type: [String], default: [] },
    unlockedSpecialAbilities: { type: [String], default: [] },
    unlockedProfileBackgrounds: { type: [String], default: [] },
    unlockedOther: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальные поля
userSchema.virtual('fullName').get(function() {
  return this.name;
});

userSchema.virtual('levelDetails').get(function() {
  return null;
});

// Индексы (без дублирования)
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ level: 1 });
userSchema.index({ experiencePoints: 1 });
userSchema.index({ isActive: 1 });

// Хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для проверки пароля
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Метод для проверки, изменился ли пароль после выдачи токена
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Метод для блокировки аккаунта после неудачных попыток входа
userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    throw new Error('Аккаунт временно заблокирован. Попробуйте позже.');
  }
  if (this.loginAttempts >= 5 && Date.now() - this.lockUntil > 2 * 60 * 60 * 1000) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
  }
  if (this.loginAttempts >= 5 && !this.lockUntil) {
    this.lockUntil = Date.now() + 15 * 60 * 1000;
  }
  await this.save({ validateBeforeSave: false });
};

// Метод для сброса счетчика неудачных попыток
userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save({ validateBeforeSave: false });
};

// Метод для добавления опыта
userSchema.methods.addExperience = async function(points, reason) {
  this.experiencePoints += points;
  this.totalAchievementPoints += points;
  await this.checkLevelUp();
  await this.save();
  const ExperienceHistory = require('./ExperienceHistory');
  await ExperienceHistory.create({
    userId: this._id,
    points,
    reason,
    newTotal: this.experiencePoints
  });
  return this;
};

// Метод для проверки повышения уровня
userSchema.methods.checkLevelUp = async function() {
  const UserLevel = require('./UserLevel');
  const currentLevelData = await UserLevel.getLevelByPoints(this.experiencePoints);
  if (currentLevelData.level > this.level) {
    const oldLevel = this.level;
    this.level = currentLevelData.level;
    this.levelProgress.lastLevelUp = new Date();
    await this.updateLevelProgress();
    if (currentLevelData.unlocks) {
      const unlocks = currentLevelData.unlocks;
      if (unlocks.themes && unlocks.themes.length > 0) {
        unlocks.themes.forEach(theme => {
          if (!this.rewards.unlockedThemes.includes(theme)) {
            this.rewards.unlockedThemes.push(theme);
          }
        });
      }
      if (unlocks.badgeFrames && unlocks.badgeFrames.length > 0) {
        unlocks.badgeFrames.forEach(frame => {
          if (!this.rewards.unlockedBadgeFrames.includes(frame)) {
            this.rewards.unlockedBadgeFrames.push(frame);
          }
        });
      }
      if (unlocks.avatarEffects && unlocks.avatarEffects.length > 0) {
        unlocks.avatarEffects.forEach(effect => {
          if (!this.rewards.unlockedAvatarEffects.includes(effect)) {
            this.rewards.unlockedAvatarEffects.push(effect);
          }
        });
      }
      if (unlocks.specialAbilities && unlocks.specialAbilities.length > 0) {
        unlocks.specialAbilities.forEach(ability => {
          if (!this.rewards.unlockedSpecialAbilities.includes(ability)) {
            this.rewards.unlockedSpecialAbilities.push(ability);
          }
        });
      }
      if (unlocks.other) {
        this.rewards.unlockedOther = { ...this.rewards.unlockedOther, ...unlocks.other };
      }
    }
    const Notification = require('./Notification');
    await Notification.create({
      userId: this._id,
      type: 'level_up',
      title: '🎉 Повышение уровня!',
      message: `Вы достигли уровня ${currentLevelData.level}: ${currentLevelData.name}`,
      data: {
        oldLevel,
        newLevel: currentLevelData.level,
        levelName: currentLevelData.name,
        icon: currentLevelData.icon,
        color: currentLevelData.color,
        unlocks: currentLevelData.unlocks
      }
    });
    return {
      leveledUp: true,
      oldLevel,
      newLevel: currentLevelData.level,
      levelData: currentLevelData
    };
  }
  await this.updateLevelProgress();
  return {
    leveledUp: false,
    currentLevel: this.level
  };
};

// Метод для обновления прогресса уровня
userSchema.methods.updateLevelProgress = async function() {
  const UserLevel = require('./UserLevel');
  const progress = await UserLevel.getProgressToNextLevel(this.experiencePoints, this.level);
  this.levelProgress = {
    currentLevel: progress.currentLevel.level,
    nextLevel: progress.nextLevel ? progress.nextLevel.level : progress.currentLevel.level,
    progressPercentage: progress.progressPercentage,
    pointsToNextLevel: progress.pointsToNextLevel,
    lastLevelUp: this.levelProgress.lastLevelUp
  };
  await this.save();
  return this.levelProgress;
};

// Метод для обновления статистики достижений
userSchema.methods.updateAchievementStats = async function() {
  const UserAchievement = require('./UserAchievement');
  const stats = await UserAchievement.getUserProgress(this._id);
  this.achievementStats = {
    totalUnlocked: stats.unlockedCount || 0,
    totalPoints: stats.totalPoints || 0,
    byCategory: {},
    byDifficulty: {}
  };
  if (stats.byCategory && Array.isArray(stats.byCategory)) {
    stats.byCategory.forEach(cat => {
      this.achievementStats.byCategory[cat.category] = cat.unlocked || 0;
    });
  }
  if (stats.byDifficulty && Array.isArray(stats.byDifficulty)) {
    stats.byDifficulty.forEach(diff => {
      this.achievementStats.byDifficulty[diff.difficulty] = diff.unlocked || 0;
    });
  }
  await this.save();
  return this.achievementStats;
};

// Метод для обновления серии
userSchema.methods.updateStreak = async function() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (this.streaks.lastActiveDate) {
    const lastActive = new Date(this.streaks.lastActiveDate);
    const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      this.streaks.current += 1;
      if (this.streaks.current > this.streaks.longest) {
        this.streaks.longest = this.streaks.current;
      }
    } else if (diffDays > 1) {
      this.streaks.current = 1;
    }
  } else {
    this.streaks.current = 1;
  }
  this.streaks.lastActiveDate = today;
  await this.save();
  const Achievement = require('./Achievement');
  if (this.streaks.current >= 3) {
    await Achievement.checkAchievement(this._id, 'STREAK_3');
  }
  if (this.streaks.current >= 7) {
    await Achievement.checkAchievement(this._id, 'STREAK_7');
  }
  if (this.streaks.current >= 30) {
    await Achievement.checkAchievement(this._id, 'STREAK_30');
  }
  return this.streaks;
};

// Метод для добавления бейджа в отображаемые
userSchema.methods.addDisplayedBadge = async function(achievementId, position = null) {
  if (!this.badges) {
    this.badges = { displayedBadges: [], showBadges: true };
  }
  const existingIndex = this.badges.displayedBadges.findIndex(
    badge => badge.achievementId.toString() === achievementId.toString()
  );
  if (existingIndex !== -1) {
    if (position !== null) {
      this.badges.displayedBadges[existingIndex].position = position;
    }
  } else {
    const newBadge = {
      achievementId,
      position: position || (this.badges.displayedBadges.length + 1)
    };
    this.badges.displayedBadges.push(newBadge);
  }
  if (this.badges.displayedBadges.length > 6) {
    this.badges.displayedBadges = this.badges.displayedBadges.slice(0, 6);
  }
  await this.save();
  return this.badges;
};

// Метод для удаления бейджа из отображаемых
userSchema.methods.removeDisplayedBadge = async function(achievementId) {
  if (!this.badges || !this.badges.displayedBadges) return;
  this.badges.displayedBadges = this.badges.displayedBadges.filter(
    badge => badge.achievementId.toString() !== achievementId.toString()
  );
  await this.save();
  return this.badges;
};

// Метод для получения отображаемых бейджей с деталями
userSchema.methods.getDisplayedBadges = async function() {
  if (!this.badges || !this.badges.displayedBadges || this.badges.displayedBadges.length === 0) return [];
  const Achievement = require('./Achievement');
  const displayedBadges = [];
  for (const badge of this.badges.displayedBadges) {
    const achievement = await Achievement.findById(badge.achievementId)
      .select('name icon difficulty difficultyColor points category');
    if (achievement) {
      displayedBadges.push({
        achievementId: badge.achievementId,
        position: badge.position,
        name: achievement.name,
        icon: achievement.icon,
        difficulty: achievement.difficulty,
        difficultyColor: achievement.difficultyColor,
        points: achievement.points,
        category: achievement.category
      });
    }
  }
  displayedBadges.sort((a, b) => a.position - b.position);
  return displayedBadges;
};

// Метод для применения темы профиля
userSchema.methods.applyTheme = async function(theme) {
  if (!this.rewards.unlockedThemes.includes(theme)) {
    throw new Error('Тема не разблокирована');
  }
  this.profileSettings.profileTheme = theme;
  await this.save();
  return this.profileSettings;
};

// Метод для применения эффекта аватара
userSchema.methods.applyAvatarEffect = async function(effect) {
  if (!this.rewards.unlockedAvatarEffects.includes(effect)) {
    throw new Error('Эффект не разблокирован');
  }
  this.profileSettings.avatarEffect = effect;
  await this.save();
  return this.profileSettings;
};

// Метод для применения рамки для бейджей
userSchema.methods.applyBadgeFrame = async function(frame) {
  if (!this.rewards.unlockedBadgeFrames.includes(frame)) {
    throw new Error('Рамка не разблокирована');
  }
  this.profileSettings.badgeFrame = frame;
  await this.save();
  return this.profileSettings;
};

// Метод для применения фона профиля
userSchema.methods.applyProfileBackground = async function(background) {
  if (!this.rewards.unlockedProfileBackgrounds.includes(background)) {
    throw new Error('Фон не разблокирован');
  }
  this.profileSettings.profileBackground = background;
  await this.save();
  return this.profileSettings;
};

// Метод для получения активных наград
userSchema.methods.getActiveRewards = function() {
  return {
    theme: this.profileSettings.profileTheme,
    avatarEffect: this.profileSettings.avatarEffect,
    badgeFrame: this.profileSettings.badgeFrame,
    profileBackground: this.profileSettings.profileBackground
  };
};

// Предварительная валидация перед сохранением
userSchema.pre('validate', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }
  next();
});

// Статический метод для поиска по email
userSchema.statics.findByEmail = async function(email) {
  try {
    const user = await this.findOne({ email: email.toLowerCase().trim() });
    return user;
  } catch (error) {
    throw new Error(`Ошибка при поиске пользователя: ${error.message}`);
  }
};

module.exports = mongoose.model('User', userSchema);