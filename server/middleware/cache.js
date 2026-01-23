// server/middleware/cache.js

const redis = require('../config/redis');

// Генерация ключа кэша на основе запроса
const generateCacheKey = (req) => {
  const path = req.originalUrl || req.path;
  const query = req.query && Object.keys(req.query).length > 0 
    ? JSON.stringify(req.query) 
    : '';
  const user = req.user ? req.user.id : 'guest';
  return `cache:${user}:${path}${query}`;
};

// Middleware для кэширования GET запросов
const cacheMiddleware = (duration = 300) => { // 5 минут по умолчанию
  return async (req, res, next) => {
    // Кэшируем только GET запросы
    if (req.method !== 'GET') {
      return next();
    }

    // Пропускаем определенные пути
    const skipPaths = ['/api/health', '/api/auth/me'];
    if (skipPaths.includes(req.path)) {
      return next();
    }

    const cacheKey = generateCacheKey(req);

    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log(`✅ Cache hit: ${cacheKey}`);
        return res.json({
          success: true,
          fromCache: true,
          ...cachedData
        });
      }

      // Сохраняем оригинальный метод res.json
      const originalJson = res.json;
      let responseSent = false;

      // Перехватываем отправку ответа
      res.json = function(data) {
        // Если ответ уже был отправлен, выходим
        if (responseSent) {
          return originalJson.call(this, data);
        }

        responseSent = true;

        // Кэшируем только успешные ответы
        if (res.statusCode >= 200 && res.statusCode < 300 && data.success !== false) {
          // Не кэшируем ответы, которые уже помечены как из кэша
          if (!data.fromCache) {
            redis.set(cacheKey, data, duration)
              .then(() => {
                console.log(`✅ Cache set: ${cacheKey}`);
              })
              .catch(err => {
                console.error('❌ Cache set failed:', err.message);
              });
          }
        }

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('❌ Cache middleware error:', error.message);
      next();
    }
  };
};

// Функция для очистки кэша по паттерну
const clearCacheByPattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      const pipeline = redis.client.multi();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      console.log(`✅ Cleared ${keys.length} cache entries for pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('❌ Clear cache error:', error.message);
  }
};

// Middleware для очистки кэша после изменений
const clearCacheOnMutation = (patterns = []) => {
  return async (req, res, next) => {
    // Сохраняем оригинальный метод res.json
    const originalJson = res.json;
    let responseSent = false;

    res.json = async function(data) {
      // Если ответ уже был отправлен, выходим
      if (responseSent) {
        return originalJson.call(this, data);
      }

      responseSent = true;

      // Очищаем кэш только для успешных операций
      if (res.statusCode >= 200 && res.statusCode < 300 && data.success !== false) {
        try {
          // Очищаем кэш текущего пользователя
          if (req.user) {
            await clearCacheByPattern(`cache:${req.user.id}:*`);
          }

          // Очищаем дополнительные паттерны
          for (const pattern of patterns) {
            await clearCacheByPattern(pattern);
          }

          // Очищаем гостевой кэш для публичных данных
          await clearCacheByPattern('cache:guest:*');
        } catch (error) {
          console.error('❌ Clear cache on mutation error:', error.message);
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// Rate limiting с Redis
const rateLimitMiddleware = ({
  windowMs = 15 * 60 * 1000, // 15 минут
  maxRequests = 100,
  keyPrefix = 'rate_limit'
} = {}) => {
  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${keyPrefix}:${ip}:${req.path}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        // Устанавливаем TTL при первом запросе
        await redis.client.expire(key, Math.floor(windowMs / 1000));
      }
      
      if (current > maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Слишком много запросов. Пожалуйста, попробуйте позже.'
        });
      }
      
      // Добавляем заголовки с информацией о лимите
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + Math.floor(windowMs / 1000));
      
      next();
    } catch (error) {
      console.error('❌ Rate limit error:', error.message);
      next(); // Пропускаем лимит в случае ошибки Redis
    }
  };
};

module.exports = {
  cacheMiddleware,
  clearCacheByPattern,
  clearCacheOnMutation,
  rateLimitMiddleware
};