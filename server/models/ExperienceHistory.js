// server/models/ExperienceHistory.js

const mongoose = require('mongoose');

const experienceHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID пользователя обязательно']
  },
  points: {
    type: Number,
    required: [true, 'Количество очков обязательно'],
    min: [1, 'Очки должны быть положительными']
  },
  reason: {
    type: String,
    required: [true, 'Причина получения очков обязательна'],
    trim: true,
    enum: {
      values: [
        'achievement',      // Получение достижения
        'daily_login',      // Ежедневный вход
        'flashcard_created',// Создание карточки
        'note_created',     // Создание заметки
        'group_created',    // Создание группы
        'member_invited',   // Приглашение участника
        'flashcard_studied',// Изучение карточки
        'streak_bonus',     // Бонус за серию
        'profile_completed',// Заполнение профиля
        'activity_bonus'    // Бонус за активность
      ],
      message: 'Недопустимая причина получения очков'
    }
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Может быть null для некоторых причин
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  newTotal: {
    type: Number,
    required: [true, 'Новый общий счет обязателен']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Индексы для оптимизации запросов
experienceHistorySchema.index({ userId: 1, createdAt: -1 });
experienceHistorySchema.index({ userId: 1, reason: 1 });
experienceHistorySchema.index({ createdAt: -1 });

// Виртуальное поле для получения названия причины
experienceHistorySchema.virtual('reasonLabel').get(function() {
  const labels = {
    achievement: 'Достижение',
    daily_login: 'Ежедневный вход',
    flashcard_created: 'Создание карточки',
    note_created: 'Создание заметки',
    group_created: 'Создание группы',
    member_invited: 'Приглашение участника',
    flashcard_studied: 'Изучение карточки',
    streak_bonus: 'Бонус за серию',
    profile_completed: 'Заполнение профиля',
    activity_bonus: 'Бонус за активность'
  };
  
  return labels[this.reason] || this.reason;
});

module.exports = mongoose.model('ExperienceHistory', experienceHistorySchema);