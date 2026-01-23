// server/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

// Общий лимитер для всех запросов
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: {
    success: false,
    error: 'Слишком много запросов с этого IP. Пожалуйста, попробуйте позже.'
  },
  standardHeaders: true, // Возвращает заголовки RateLimit-*
  legacyHeaders: false, // Отключает X-RateLimit-* заголовки
  skipSuccessfulRequests: false // учитываем все запросы
});

// Лимитер для авторизации
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // максимум 5 попыток входа
  message: {
    success: false,
    error: 'Слишком много попыток входа. Пожалуйста, попробуйте через час.'
  },
  skipSuccessfulRequests: true // не учитываем успешные попытки
});

// Лимитер для создания контента
const createContentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 50, // максимум 50 созданий контента
  message: {
    success: false,
    error: 'Слишком много созданий контента. Пожалуйста, замедлите темп.'
  }
});

// Лимитер для API (более строгий)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 30, // максимум 30 запросов в минуту
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