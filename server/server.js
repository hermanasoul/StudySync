// server/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { cacheMiddleware, rateLimitMiddleware } = require('./middleware/cache');
const redis = require('./config/redis');
const WebSocketServer = require('./websocket');

const app = express();
const server = http.createServer(app);

// Инициализация WebSocket сервера
const wsServer = new WebSocketServer(server);
app.set('ws', wsServer); // Делаем доступным в маршрутах

// Безопасность: Helmet для защиты заголовков
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS конфигурация
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
app.use('/api/', rateLimitMiddleware({ maxRequests: 100 }));
app.use('/api/auth/login', rateLimitMiddleware({ maxRequests: 5, windowMs: 60 * 60 * 1000 }));
app.use('/api/auth/register', rateLimitMiddleware({ maxRequests: 3, windowMs: 60 * 60 * 1000 }));

// Парсинг JSON с лимитом
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Глобальное кэширование GET запросов (5 минут)
app.use('/api/', cacheMiddleware(300));

// Маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/flashcards', require('./routes/flashcards'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/notifications', require('./routes/notifications')); // Новый маршрут уведомлений

// Проверка работы сервера
app.get('/', (req, res) => {
  res.json({
    message: 'StudySync Backend is working! 🚀',
    version: '1.3.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      redis: redis.isConnected,
      websocket: wsServer.io.engine.clientsCount,
      database: mongoose.connection.readyState === 1,
      notifications: true
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const redisStatus = redis.isConnected ? 'Connected' : 'Disconnected';
  const websocketStatus = wsServer.io.engine.clientsCount;
  
  // Получаем статистику уведомлений
  const Notification = require('./models/Notification');
  const notificationStats = await Notification.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } }
      }
    }
  ]);
  
  // Получаем количество пользователей
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  
  // Получаем количество групп
  const Group = require('./models/Group');
  const groupCount = await Group.countDocuments();
  
  res.json({
    status: 'OK',
    message: 'Server is running smoothly',
    version: '1.3.0',
    services: {
      database: dbStatus,
      redis: redisStatus,
      websocket: {
        connectedClients: websocketStatus,
        status: websocketStatus >= 0 ? 'Running' : 'Error'
      }
    },
    statistics: {
      users: userCount,
      groups: groupCount,
      notifications: notificationStats[0] || { total: 0, unread: 0 }
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection test endpoint
app.get('/api/ws-test', (req, res) => {
  const { userId, event = 'test', data = {} } = req.query;
  
  if (userId && wsServer.isUserOnline(userId)) {
    wsServer.emitToUser(userId, event, {
      ...data,
      serverTime: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: `Event "${event}" sent to user ${userId}`,
      online: true
    });
  } else {
    res.json({
      success: false,
      message: `User ${userId} is not online`,
      online: false
    });
  }
});

// Notification test endpoint
app.get('/api/notifications/test', async (req, res) => {
  const { userId, type = 'system', title = 'Test Notification', message = 'This is a test notification' } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  try {
    const notification = await wsServer.sendNotification(userId, {
      type,
      title,
      message,
      data: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Test notification sent',
      notification: {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
      error: error.message
    });
  }
});

// Обработка 404
app.use(notFound);

// Глобальный обработчик ошибок
app.use(errorHandler);

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    
    // Проверяем наличие модели Notification
    const Notification = require('./models/Notification');
    console.log('✅ Notification model loaded');
    
    // Создаем индексы для уведомлений
    Notification.createIndexes().then(() => {
      console.log('✅ Notification indexes created');
    }).catch(err => {
      console.error('❌ Error creating notification indexes:', err);
    });
  })
  .catch((error) => {
    console.log('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('👋 Starting graceful shutdown...');
  
  try {
    // Закрываем HTTP сервер
    server.close(() => {
      console.log('✅ HTTP server closed');
    });
    
    // Закрываем WebSocket сервер
    wsServer.io.close(() => {
      console.log('✅ WebSocket server closed');
    });
    
    // Закрываем Redis соединение
    await redis.disconnect();
    console.log('✅ Redis connection closed');
    
    // Закрываем MongoDB соединение
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    console.log('💥 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Обработка сигналов завершения
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  gracefulShutdown();
});

// Обработка необработанных промисов
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  gracefulShutdown();
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🎯 StudySync Server is running on port ${PORT}`);
  console.log(`🔗 HTTP: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🧠 Redis: ${redis.isConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`🔄 WebSocket: ${wsServer.io.engine.clientsCount} clients connected`);
  console.log(`📬 Notifications: Enabled`);
});