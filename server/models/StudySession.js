// server/models/StudySession.js

const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название сессии обязательно'],
    trim: true,
    minlength: [3, 'Название должно быть не менее 3 символов'],
    maxlength: [100, 'Название не должно превышать 100 символов']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Описание не должно превышать 500 символов']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID хоста обязательно'],
    index: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'co-host', 'participant'],
      default: 'participant'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'away', 'left'],
      default: 'active'
    },
    stats: {
      timeSpent: {
        type: Number,
        default: 0
      },
      cardsReviewed: {
        type: Number,
        default: 0
      },
      correctAnswers: {
        type: Number,
        default: 0
      },
      streak: {
        type: Number,
        default: 0
      }
    }
  }],
  
  // Интеграция с существующей системой
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'ID предмета обязательно'],
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  
  // Настройки доступа (используем вашу логику друзей)
  accessType: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Карточки для изучения (используем вашу модель Flashcard)
  flashcards: [{
    flashcardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flashcard',
      required: true
    },
    order: {
      type: Number,
      default: 0
    },
    reviewedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      isCorrect: Boolean,
      reviewedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Текущее состояние сессии
  currentFlashcardIndex: {
    type: Number,
    default: 0
  },
  studyMode: {
    type: String,
    enum: ['collaborative', 'individual', 'host-controlled'],
    default: 'collaborative'
  },
  
  // Настройки Pomodoro (интегрируем с вашей системой достижений)
  pomodoroSettings: {
    workDuration: {
      type: Number,
      default: 25,
      min: 1,
      max: 60
    },
    breakDuration: {
      type: Number,
      default: 5,
      min: 1,
      max: 30
    },
    autoSwitch: {
      type: Boolean,
      default: true
    }
  },
  
  timerState: {
    active: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['work', 'break'],
      default: 'work'
    },
    startTime: Date,
    remaining: Number,
    totalElapsed: {
      type: Number,
      default: 0
    }
  },
  
  // Статус сессии
  status: {
    type: String,
    enum: ['waiting', 'active', 'paused', 'completed'],
    default: 'waiting'
  },
  
  // Статистика сессии
  sessionStats: {
    totalTime: {
      type: Number,
      default: 0
    },
    totalCardsReviewed: {
      type: Number,
      default: 0
    },
    averageSuccessRate: {
      type: Number,
      default: 0
    }
  },
  
  // Чат сессии (интеграция с вашей системой чатов)
  chatEnabled: {
    type: Boolean,
    default: true
  },
  
  // Настройки оповещений
  notifications: {
    onUserJoin: {
      type: Boolean,
      default: true
    },
    onTimerChange: {
      type: Boolean,
      default: true
    },
    onCardChange: {
      type: Boolean,
      default: true
    }
  },
  
  // Интеграция с системой достижений
  achievementsUnlocked: [{
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальные поля
studySessionSchema.virtual('activeParticipants').get(function() {
  return this.participants.filter(p => p.status === 'active');
});

studySessionSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.status === 'active').length;
});

// Индексы
studySessionSchema.index({ host: 1, status: 1, createdAt: -1 });
studySessionSchema.index({ subjectId: 1, status: 1, createdAt: -1 });
studySessionSchema.index({ 'participants.user': 1, status: 1 });
studySessionSchema.index({ accessType: 1, status: 1 });
studySessionSchema.index({ createdAt: -1 });

// Предварительная обработка перед сохранением
studySessionSchema.pre('save', function(next) {
  // Убеждаемся, что название правильно отформатировано
  if (this.name) {
    this.name = this.name.trim();
  }
  
  if (this.description) {
    this.description = this.description.trim();
  }
  
  // Проверяем, что есть хотя бы один активный участник
  const activeParticipants = this.participants.filter(p => p.status === 'active');
  if (activeParticipants.length === 0 && this.status !== 'waiting') {
    this.status = 'completed';
  }
  
  next();
});

// Методы
studySessionSchema.methods.addParticipant = async function(userId, role = 'participant') {
  const existing = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (existing) {
    if (existing.status === 'left') {
      existing.status = 'active';
      existing.joinedAt = new Date();
    }
    return this;
  }
  
  this.participants.push({
    user: userId,
    role,
    status: 'active',
    joinedAt: new Date()
  });
  
  return this.save();
};

studySessionSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString() && p.status === 'active'
  );
  
  if (participant) {
    participant.status = 'left';
    
    // Если уходит хост, передаем хостство другому участнику
    if (this.host.toString() === userId.toString()) {
      const newHost = this.participants.find(p => 
        p.user.toString() !== userId.toString() && p.status === 'active'
      );
      if (newHost) {
        newHost.role = 'host';
        this.host = newHost.user;
      }
    }
  }
  
  return this.save();
};

studySessionSchema.methods.updateParticipantStats = async function(userId, stats) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString() && p.status === 'active'
  );
  
  if (participant) {
    if (stats.timeSpent !== undefined) participant.stats.timeSpent += stats.timeSpent;
    if (stats.cardsReviewed !== undefined) participant.stats.cardsReviewed += stats.cardsReviewed;
    if (stats.correctAnswers !== undefined) participant.stats.correctAnswers += stats.correctAnswers;
    if (stats.streak !== undefined) participant.stats.streak = stats.streak;
    
    await this.save();
  }
  
  return participant;
};

studySessionSchema.methods.checkAchievements = async function() {
  const Achievement = require('./Achievement');
  const User = require('./User');
  
  // Проверяем достижения для всех активных участников
  for (const participant of this.activeParticipants) {
    const user = await User.findById(participant.user);
    
    // Достижение "Первая совместная сессия"
    if (participant.stats.cardsReviewed >= 1) {
      await Achievement.checkAchievement(participant.user, 'FIRST_STUDY_SESSION');
    }
    
    // Достижение "Длительная сессия" (более 30 минут)
    if (participant.stats.timeSpent >= 1800) {
      await Achievement.checkAchievement(participant.user, 'LONG_STUDY_SESSION');
    }
    
    // Достижение "Успешная сессия" (более 80% правильных ответов)
    if (participant.stats.cardsReviewed > 0) {
      const successRate = (participant.stats.correctAnswers / participant.stats.cardsReviewed) * 100;
      if (successRate >= 80) {
        await Achievement.checkAchievement(participant.user, 'SUCCESSFUL_SESSION');
      }
    }
    
    // Достижение "Социальное изучение" (с друзьями)
    if (this.accessType === 'friends' && this.participantCount >= 3) {
      await Achievement.checkAchievement(participant.user, 'SOCIAL_STUDY');
    }
  }
};

module.exports = mongoose.model('StudySession', studySessionSchema);