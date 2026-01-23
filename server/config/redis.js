// server/config/redis.js

const redis = require('redis');
const { AppError } = require('../middleware/errorHandler');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connect();
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('❌ Too many Redis reconnection attempts');
              return new Error('Too many retries');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis is ready');
      });

      this.client.on('end', () => {
        console.log('❌ Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      // Не падаем при ошибке Redis - продолжаем работу без кэша
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) return null;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Redis GET error:', error.message);
      return null;
    }
  }

  async set(key, value, expirationInSeconds = 3600) {
    try {
      if (!this.isConnected) return;
      await this.client.set(key, JSON.stringify(value), {
        EX: expirationInSeconds
      });
    } catch (error) {
      console.error('❌ Redis SET error:', error.message);
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) return;
      await this.client.del(key);
    } catch (error) {
      console.error('❌ Redis DEL error:', error.message);
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) return 0;
      return await this.client.exists(key);
    } catch (error) {
      console.error('❌ Redis EXISTS error:', error.message);
      return 0;
    }
  }

  async keys(pattern) {
    try {
      if (!this.isConnected) return [];
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('❌ Redis KEYS error:', error.message);
      return [];
    }
  }

  async flushAll() {
    try {
      if (!this.isConnected) return;
      await this.client.flushAll();
    } catch (error) {
      console.error('❌ Redis FLUSHALL error:', error.message);
    }
  }

  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        console.log('✅ Redis connection closed');
      }
    } catch (error) {
      console.error('❌ Redis disconnect error:', error.message);
    }
  }

  // Метод для инкремента счетчика
  async incr(key) {
    try {
      if (!this.isConnected) return 0;
      return await this.client.incr(key);
    } catch (error) {
      console.error('❌ Redis INCR error:', error.message);
      return 0;
    }
  }

  // Метод для добавления в множество
  async sadd(key, value) {
    try {
      if (!this.isConnected) return;
      await this.client.sAdd(key, value);
    } catch (error) {
      console.error('❌ Redis SADD error:', error.message);
    }
  }

  // Метод для получения множества
  async smembers(key) {
    try {
      if (!this.isConnected) return [];
      return await this.client.sMembers(key);
    } catch (error) {
      console.error('❌ Redis SMEMBERS error:', error.message);
      return [];
    }
  }

  // Метод для удаления из множества
  async srem(key, value) {
    try {
      if (!this.isConnected) return;
      await this.client.sRem(key, value);
    } catch (error) {
      console.error('❌ Redis SREM error:', error.message);
    }
  }

  // Метод для публикации в канал
  async publish(channel, message) {
    try {
      if (!this.isConnected) return;
      await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error('❌ Redis PUBLISH error:', error.message);
    }
  }
}

module.exports = new RedisClient();