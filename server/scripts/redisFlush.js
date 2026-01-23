// server/scripts/redisFlush.js

const redis = require('../config/redis');

async function flushRedis() {
  try {
    console.log('🔄 Flushing Redis cache...');
    await redis.flushAll();
    console.log('✅ Redis cache flushed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error flushing Redis:', error.message);
    process.exit(1);
  }
}

flushRedis();