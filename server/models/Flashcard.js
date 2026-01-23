// server/models/Flashcard.js

const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Вопрос обязателен'],
    trim: true,
    minlength: [3, 'Вопрос должен быть не менее 3 символов'],
    maxlength: [500, 'Вопрос не должен превышать 500 символов']
  },
  answer: {
    type: String,
    required: [true, 'Ответ обязателен'],
    trim: true,
    minlength: [1, 'Ответ должен быть не менее 1 символа'],
    maxlength: [1000, 'Ответ не должен превышать 1000 символов']
  },
  hint: {
    type: String,
    trim: true,
    default: '',
    maxlength: [200, 'Подсказка не должна превышать 200 символов']
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'ID предмета обязателен'],
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID автора обязателен'],
    index: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  difficulty: {
    type: String,
    enum: {
      values: ['easy', 'medium', 'hard'],
      message: 'Сложность должна быть: easy, medium или hard'
    },
    default: 'medium',
    index: true
  },
  knowCount: {
    type: Number,
    default: 0,
    min: [0, 'Количество правильных ответов не может быть отрицательным']
  },
  dontKnowCount: {
    type: Number,
    default: 0,
    min: [0, 'Количество неправильных ответов не может быть отрицательным']
  },
  lastReviewed: {
    type: Date,
    index: true
  },
  nextReviewDate: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальное поле для вычисления успешности
flashcardSchema.virtual('successRate').get(function() {
  const totalAttempts = this.knowCount + this.dontKnowCount;
  if (totalAttempts === 0) return 0;
  return Math.round((this.knowCount / totalAttempts) * 100);
});

// Виртуальное поле для вычисления общего количества попыток
flashcardSchema.virtual('totalAttempts').get(function() {
  return this.knowCount + this.dontKnowCount;
});

// Предварительная валидация перед сохранением
flashcardSchema.pre('save', function(next) {
  // Автоматически обновляем nextReviewDate на основе алгоритма интервального повторения
  if (this.isModified('knowCount') || this.isModified('dontKnowCount')) {
    const interval = this.calculateNextReviewInterval();
    this.nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
  }
  
  // Убеждаемся, что вопрос и ответ правильно отформатированы
  if (this.question) {
    this.question = this.question.trim();
  }
  
  if (this.answer) {
    this.answer = this.answer.trim();
  }
  
  if (this.hint) {
    this.hint = this.hint.trim();
  }
  
  next();
});

// Метод для вычисления интервала следующего повторения
flashcardSchema.methods.calculateNextReviewInterval = function() {
  // Алгоритм интервального повторения (упрощенный SM-2)
  const totalCorrect = this.knowCount;
  const totalIncorrect = this.dontKnowCount;
  
  if (totalIncorrect > totalCorrect) {
    return 1; // Повторить завтра
  } else if (totalCorrect === 0) {
    return 1; // Первое изучение
  } else if (totalCorrect === 1) {
    return 3; // Через 3 дня
  } else if (totalCorrect === 2) {
    return 7; // Через неделю
  } else if (totalCorrect === 3) {
    return 14; // Через 2 недели
  } else if (totalCorrect === 4) {
    return 30; // Через месяц
  } else {
    return 60; // Через 2 месяца
  }
};

// Метод для обновления статистики после ответа
flashcardSchema.methods.updateAfterAnswer = function(isCorrect) {
  if (isCorrect) {
    this.knowCount += 1;
    
    if (this.knowCount >= 3) {
      this.difficulty = 'easy';
    } else if (this.knowCount >= 1) {
      this.difficulty = 'medium';
    }
  } else {
    this.dontKnowCount += 1;
    this.difficulty = 'hard';
  }
  
  this.lastReviewed = new Date();
  this.nextReviewDate = new Date(Date.now() + this.calculateNextReviewInterval() * 24 * 60 * 60 * 1000);
  
  return this.save();
};

// Метод для сброса статистики
flashcardSchema.methods.resetStats = function() {
  this.knowCount = 0;
  this.dontKnowCount = 0;
  this.difficulty = 'medium';
  this.lastReviewed = null;
  this.nextReviewDate = null;
  
  return this.save();
};

// Индексы для оптимизации запросов
flashcardSchema.index({ subjectId: 1, authorId: 1, createdAt: -1 });
flashcardSchema.index({ groupId: 1, createdAt: -1 });
flashcardSchema.index({ difficulty: 1, lastReviewed: 1 });
flashcardSchema.index({ authorId: 1, nextReviewDate: 1 });
flashcardSchema.index({ createdAt: -1 });
flashcardSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Flashcard', flashcardSchema);