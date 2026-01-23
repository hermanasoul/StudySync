// server/models/Note.js

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Заголовок обязателен'],
    trim: true,
    minlength: [3, 'Заголовок должен быть не менее 3 символов'],
    maxlength: [100, 'Заголовок не должен превышать 100 символов']
  },
  content: {
    type: String,
    required: [true, 'Содержание обязательно'],
    trim: true,
    minlength: [10, 'Содержание должно быть не менее 10 символов'],
    maxlength: [10000, 'Содержание не должно превышать 10000 символов']
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
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    minlength: [2, 'Тег должен быть не менее 2 символов'],
    maxlength: [20, 'Тег не должен превышать 20 символов']
  }],
  fileUrl: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true; // Пустая строка разрешена
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Некорректный URL файла'
    }
  },
  fileName: {
    type: String,
    default: '',
    maxlength: [200, 'Имя файла не должно превышать 200 символов']
  },
  fileSize: {
    type: Number,
    default: 0,
    min: [0, 'Размер файла не может быть отрицательным']
  },
  fileType: {
    type: String,
    default: '',
    maxlength: [50, 'Тип файла не должен превышать 50 символов']
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'Количество просмотров не может быть отрицательным']
  },
  lastViewed: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальное поле для краткого содержания
noteSchema.virtual('excerpt').get(function() {
  return this.content.length > 200 
    ? this.content.substring(0, 200) + '...' 
    : this.content;
});

// Виртуальное поле для отформатированной даты
noteSchema.virtual('formattedDate').get(function() {
  return this.updatedAt.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

// Предварительная валидация перед сохранением
noteSchema.pre('save', function(next) {
  // Убеждаемся, что заголовок и содержание правильно отформатированы
  if (this.title) {
    this.title = this.title.trim();
  }
  
  if (this.content) {
    this.content = this.content.trim();
  }
  
  // Уникальные теги (без дубликатов)
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()))];
  }
  
  next();
});

// Метод для увеличения счетчика просмотров
noteSchema.methods.incrementView = function() {
  this.views += 1;
  this.lastViewed = new Date();
  return this.save();
};

// Метод для добавления тега
noteSchema.methods.addTag = function(tag) {
  const normalizedTag = tag.toLowerCase().trim();
  
  if (!this.tags.includes(normalizedTag)) {
    this.tags.push(normalizedTag);
  }
  
  return this.save();
};

// Метод для удаления тега
noteSchema.methods.removeTag = function(tag) {
  const normalizedTag = tag.toLowerCase().trim();
  this.tags = this.tags.filter(t => t !== normalizedTag);
  
  return this.save();
};

// Индексы для оптимизации запросов
noteSchema.index({ subjectId: 1, authorId: 1, createdAt: -1 });
noteSchema.index({ groupId: 1, createdAt: -1 });
noteSchema.index({ authorId: 1, updatedAt: -1 });
noteSchema.index({ tags: 1, isPublic: 1 });
noteSchema.index({ isPublic: 1, createdAt: -1 });
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ updatedAt: -1 });

// Составной индекс для полнотекстового поиска
noteSchema.index(
  { title: 'text', content: 'text', tags: 'text' },
  {
    weights: {
      title: 10,
      tags: 5,
      content: 1
    },
    name: 'TextSearchIndex'
  }
);

module.exports = mongoose.model('Note', noteSchema);
