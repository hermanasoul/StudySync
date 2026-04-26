const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Код достижения обязателен'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Код должен быть не менее 3 символов'],
    maxlength: [50, 'Код не должен превышать 50 символов']
  },
  name: {
    type: String,
    required: [true, 'Название достижения обязательно'],
    trim: true,
    minlength: [3, 'Название должно быть не менее 3 символов'],
    maxlength: [100, 'Название не должно превышать 100 символов']
  },
  description: {
    type: String,
    required: [true, 'Описание достижения обязательно'],
    trim: true,
    minlength: [10, 'Описание должно быть не менее 10 символов'],
    maxlength: [500, 'Описание не должно превышать 500 символов']
  },
  icon: {
    type: String,
    default: '🏆',
    trim: true,
    maxlength: [10, 'Иконка не должна превышать 10 символов']
  },
  category: {
    type: String,
    required: [true, 'Категория достижения обязательна'],
    enum: {
      values: [
        'study',      // Учеба
        'group',      // Группы
        'flashcard',  // Карточки
        'note',       // Заметки
        'social',     // Социальное
        'system'      // Системное
      ],
      message: 'Недопустимая категория достижения'
    },
    index: true
  },
  difficulty: {
    type: String,
    required: [true, 'Сложность достижения обязательна'],
    enum: {
      values: ['bronze', 'silver', 'gold', 'platinum'],
      message: 'Сложность должна быть: bronze, silver, gold или platinum'
    },
    default: 'bronze',
    index: true
  },
  points: {
    type: Number,
    required: [true, 'Количество очков обязательно'],
    min: [1, 'Очки должны быть положительными'],
    max: [1000, 'Очки не должны превышать 1000']
  },
  requirements: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    required: [true, 'Требования достижения обязательны']
  },
  secret: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальное поле для получения CSS класса сложности
achievementSchema.virtual('difficultyClass').get(function() {
  const classes = {
    bronze: 'achievement-bronze',
    silver: 'achievement-silver',
    gold: 'achievement-gold',
    platinum: 'achievement-platinum'
  };
  return classes[this.difficulty] || 'achievement-bronze';
});

// Виртуальное поле для получения CSS цвета сложности
achievementSchema.virtual('difficultyColor').get(function() {
  const colors = {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2'
  };
  return colors[this.difficulty] || '#cd7f32';
});

// Статический метод для проверки достижения с защитой от дубликатов
achievementSchema.statics.checkAchievement = async function(userId, achievementCode, progress = 1) {
  try {
    const UserAchievement = require('./UserAchievement');
    const achievement = await this.findOne({ code: achievementCode, isActive: true });
    
    if (!achievement) {
      throw new Error(`Achievement ${achievementCode} not found`);
    }
    
    // Сначала попытаемся найти существующую запись
    let userAchievement = await UserAchievement.findOne({
      userId,
      achievementId: achievement._id
    });
    
    if (userAchievement) {
      // Если достижение уже существует, обновляем прогресс при необходимости
      if (progress > userAchievement.progress) {
        userAchievement.progress = progress;
        await userAchievement.save();
      }
      return userAchievement;
    }
    
    // Пытаемся создать новую запись
    try {
      const newUserAchievement = new UserAchievement({
        userId,
        achievementId: achievement._id,
        progress,
        isUnlocked: false
      });
      await newUserAchievement.save();
      return newUserAchievement;
    } catch (createError) {
      // Если возник дубликат (код 11000), значит другой поток уже создал запись
      if (createError.code === 11000) {
        // Повторно ищем и возвращаем существующую
        userAchievement = await UserAchievement.findOne({
          userId,
          achievementId: achievement._id
        });
        if (userAchievement) {
          // Могло обновиться за время ожидания, проверяем прогресс
          if (progress > userAchievement.progress) {
            userAchievement.progress = progress;
            await userAchievement.save();
          }
          return userAchievement;
        }
        // Если по какой-то причине не нашли (маловероятно), пробрасываем ошибку
        throw new Error('Concurrent achievement creation conflict');
      }
      throw createError; // Пробрасываем другие ошибки
    }
  } catch (error) {
    console.error('Error checking achievement:', error);
    throw error; // Пробрасываем для обработки выше (но теперь без дубликатов)
  }
};

// Индексы для оптимизации запросов
achievementSchema.index({ category: 1, difficulty: 1, sortOrder: 1 });
achievementSchema.index({ isActive: 1, sortOrder: 1 });
achievementSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);