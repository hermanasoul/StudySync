// server/models/User.js

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
    },
    index: true
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен быть не менее 6 символов'],
    select: false, // Не возвращать пароль по умолчанию
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
        if (!v) return true; // Пустая строка разрешена
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
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальное поле для полного имени
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Индексы для оптимизации поиска
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  // Хешируем только если пароль был изменен
  if (!this.isModified('password')) return next();
  
  try {
    // Генерируем соль
    const salt = await bcrypt.genSalt(12);
    // Хешируем пароль с солью
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
  // Если аккаунт уже заблокирован и время блокировки еще не истекло
  if (this.lockUntil && this.lockUntil > Date.now()) {
    throw new Error('Аккаунт временно заблокирован. Попробуйте позже.');
  }
  
  // Сбрасываем счетчик, если прошло более 2 часов с последней неудачной попытки
  if (this.loginAttempts >= 5 && Date.now() - this.lockUntil > 2 * 60 * 60 * 1000) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
  }
  
  // Блокируем на 15 минут после 5 неудачных попыток
  if (this.loginAttempts >= 5 && !this.lockUntil) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 минут
  }
  
  await this.save({ validateBeforeSave: false });
};

// Метод для сброса счетчика неудачных попыток
userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save({ validateBeforeSave: false });
};

// Предварительная валидация перед сохранением
userSchema.pre('validate', function(next) {
  // Убеждаемся, что email в нижнем регистре
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Убеждаемся, что имя правильно отформатировано
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }
  
  next();
});

// Статический метод для поиска по email с обработкой ошибок
userSchema.statics.findByEmail = async function(email) {
  try {
    const user = await this.findOne({ 
      email: email.toLowerCase().trim() 
    });
    return user;
  } catch (error) {
    throw new Error(`Ошибка при поиске пользователя: ${error.message}`);
  }
};

module.exports = mongoose.model('User', userSchema);