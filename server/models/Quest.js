// server/models/Quest.js

const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Код задания обязателен'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Код должен быть не менее 3 символов'],
    maxlength: [50, 'Код не должен превышать 50 символов']
  },
  name: {
    type: String,
    required: [true, 'Название задания обязательно'],
    trim: true,
    minlength: [3, 'Название должно быть не менее 3 символов'],
    maxlength: [100, 'Название не должно превышать 100 символов']
  },
  description: {
    type: String,
    required: [true, 'Описание задания обязательно'],
    trim: true,
    minlength: [10, 'Описание должно быть не менее 10 символов'],
    maxlength: [500, 'Описание не должно превышать 500 символов']
  },
  icon: {
    type: String,
    default: '🎯',
    trim: true,
    maxlength: [10, 'Иконка не должна превышать 10 символов']
  },
  type: {
    type: String,
    required: [true, 'Тип задания обязателен'],
    enum: {
      values: ['daily', 'weekly', 'monthly', 'special', 'achievement'],
      message: 'Тип задания должен быть: daily, weekly, monthly, special или achievement'
    },
    index: true
  },
  category: {
    type: String,
    required: [true, 'Категория задания обязательна'],
    enum: {
      values: [
        'study',      // Учеба
        'group',      // Группы
        'flashcard',  // Карточки
        'note',       // Заметки
        'social',     // Социальное
        'exploration' // Исследование
      ],
      message: 'Недопустимая категория задания'
    },
    index: true
  },
  difficulty: {
    type: String,
    required: [true, 'Сложность задания обязательна'],
    enum: {
      values: ['easy', 'medium', 'hard', 'expert'],
      message: 'Сложность должна быть: easy, medium, hard или expert'
    },
    default: 'medium',
    index: true
  },
  points: {
    type: Number,
    required: [true, 'Количество очков обязательно'],
    min: [1, 'Очки должны быть положительными'],
    max: [5000, 'Очки не должны превышать 5000']
  },
  requirements: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    required: [true, 'Требования задания обязательны']
  },
  rewards: {
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Опыт не может быть отрицательным']
    },
    coins: {
      type: Number,
      default: 0,
      min: [0, 'Монеты не могут быть отрицательными']
    },
    items: [{
      type: mongoose.Schema.Types.Mixed
    }],
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }
  },
  timeLimit: {
    type: Number, // В часах, 0 = без ограничения
    default: 0,
    min: [0, 'Лимит времени не может быть отрицательным']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  repeatable: {
    type: Boolean,
    default: false
  },
  maxCompletions: {
    type: Number,
    default: 1,
    min: [1, 'Максимальное количество выполнений должно быть не менее 1']
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
questSchema.virtual('difficultyClass').get(function() {
  const classes = {
    easy: 'quest-easy',
    medium: 'quest-medium',
    hard: 'quest-hard',
    expert: 'quest-expert'
  };
  return classes[this.difficulty] || 'quest-medium';
});

// Виртуальное поле для получения CSS цвета сложности
questSchema.virtual('difficultyColor').get(function() {
  const colors = {
    easy: '#10b981', // зеленый
    medium: '#f59e0b', // оранжевый
    hard: '#ef4444', // красный
    expert: '#8b5cf6' // фиолетовый
  };
  return colors[this.difficulty] || '#f59e0b';
});

// Виртуальное поле для получения типа на русском
questSchema.virtual('typeLabel').get(function() {
  const labels = {
    daily: 'Ежедневное',
    weekly: 'Еженедельное',
    monthly: 'Ежемесячное',
    special: 'Особое',
    achievement: 'Достижение'
  };
  return labels[this.type] || this.type;
});

// Статический метод для получения активных заданий
questSchema.statics.getActiveQuests = async function(userId) {
  const now = new Date();
  
  return await this.find({
    isActive: true,
    $or: [
      { endDate: { $exists: false } },
      { endDate: null },
      { endDate: { $gt: now } }
    ]
  })
  .sort({ type: 1, sortOrder: 1, createdAt: 1 })
  .lean();
};

// Статический метод для генерации ежедневных заданий
questSchema.statics.generateDailyQuests = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyQuests = [
    {
      code: 'DAILY_LOGIN',
      name: 'Ежедневный вход',
      description: 'Зайдите в приложение сегодня',
      icon: '📱',
      type: 'daily',
      category: 'system',
      difficulty: 'easy',
      points: 50,
      requirements: { action: 'login', count: 1 },
      rewards: { experience: 25 },
      repeatable: true
    },
    {
      code: 'DAILY_FLASHCARDS_5',
      name: 'Повторение карточек',
      description: 'Повторите 5 карточек за день',
      icon: '📚',
      type: 'daily',
      category: 'flashcard',
      difficulty: 'medium',
      points: 100,
      requirements: { action: 'review_flashcards', count: 5 },
      rewards: { experience: 50 },
      repeatable: true
    },
    {
      code: 'DAILY_GROUP_ACTIVITY',
      name: 'Активность в группах',
      description: 'Посетите любую группу сегодня',
      icon: '👥',
      type: 'daily',
      category: 'group',
      difficulty: 'easy',
      points: 75,
      requirements: { action: 'visit_group', count: 1 },
      rewards: { experience: 35 },
      repeatable: true
    }
  ];
  
  return dailyQuests;
};

module.exports = mongoose.model('Quest', questSchema);