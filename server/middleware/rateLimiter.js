const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

// Общий лимитер для API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: isDev ? 1000 : 100,
  message: 'Слишком много запросов. Пожалуйста, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Строгий лимитер для аутентификации
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: isDev ? 100 : 5,
  message: 'Слишком много попыток входа. Пожалуйста, попробуйте позже.',
  skipSuccessfulRequests: true,
});

// Лимитер для создания контента
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: 'Слишком много созданий контента. Пожалуйста, замедлите темп.'
  }
});

// Лимитер для API (более строгий)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Слишком много запросов к API. Пожалуйста, замедлите темп.'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  createContentLimiter,
  apiLimiter
};