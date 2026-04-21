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
const AchievementTriggers = require('./services/achievementTriggers');

const app = express();
const server = http.createServer(app);

// Инициализация WebSocket сервера
const wsServer = new WebSocketServer(server);
app.set('ws', wsServer);

// Инициализация триггеров достижений
const achievementTriggers = new AchievementTriggers(wsServer);
app.set('achievementTriggers', achievementTriggers);

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
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Парсинг JSON с лимитом
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Глобальное кэширование GET запросов (5 минут)
app.use('/api/', cacheMiddleware(300));

// Swagger документация
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'StudySync API Docs',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
  }
}));

// JSON-версия спецификации
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/flashcards', require('./routes/flashcards'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/study-sessions', require('./routes/studySessions'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/levels', require('./routes/levels'));
app.use('/api/badges', require('./routes/badges'));
app.use('/api/quests', require('./routes/quests'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/leaderboards', require('./routes/leaderboards'));

// Проверка работы сервера
app.get('/', (req, res) => {
  const wsClients = wsServer.io ? wsServer.io.engine.clientsCount : 0;
  res.json({
    message: 'StudySync Backend is working! 🚀',
    version: '1.4.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      redis: redis.isConnected,
      websocket: wsClients,
      database: mongoose.connection.readyState === 1,
      notifications: true,
      study_sessions: true,
      achievements: true,
      levels: true,
      friends: true
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const redisStatus = redis.isConnected ? 'Connected' : 'Disconnected';
  const wsClients = wsServer.io ? wsServer.io.engine.clientsCount : 0;

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

  const User = require('./models/User');
  const userCount = await User.countDocuments();

  const Group = require('./models/Group');
  const groupCount = await Group.countDocuments();

  const StudySession = require('./models/StudySession');
  const studySessionCount = await StudySession.countDocuments();

  res.json({
    status: 'OK',
    message: 'Server is running smoothly',
    version: '1.4.0',
    services: {
      database: dbStatus,
      redis: redisStatus,
      websocket: {
        connectedClients: wsClients,
        status: wsClients >= 0 ? 'Running' : 'Error'
      }
    },
    statistics: {
      users: userCount,
      groups: groupCount,
      study_sessions: studySessionCount,
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
    wsServer.sendToUser(userId, {
      type: event,
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

// Study session test endpoint
app.get('/api/study-sessions/test', async (req, res) => {
  const { userId, action = 'create', sessionId } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }

  try {
    const StudySession = require('./models/StudySession');
    let result;

    switch (action) {
      case 'create':
        const Subject = require('./models/Subject');
        const subject = await Subject.findOne();

        if (!subject) {
          return res.status(404).json({
            success: false,
            message: 'No subjects found'
          });
        }

        const newSession = new StudySession({
          name: 'Test Study Session',
          description: 'This is a test study session',
          host: userId,
          subjectId: subject._id,
          accessType: 'public',
          studyMode: 'collaborative',
          participants: [{
            user: userId,
            role: 'host',
            status: 'active'
          }],
          status: 'waiting'
        });

        await newSession.save();
        result = newSession;
        break;

      case 'join':
        if (!sessionId) {
          return res.status(400).json({
            success: false,
            message: 'Session ID is required'
          });
        }

        const session = await StudySession.findById(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            message: 'Session not found'
          });
        }

        await session.addParticipant(userId);
        result = session;
        break;
    }

    res.json({
      success: true,
      message: `Study session ${action} test completed`,
      result
    });
  } catch (error) {
    console.error('Error in study session test:', error);
    res.status(500).json({
      success: false,
      message: 'Error in study session test',
      error: error.message
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

    const models = ['Notification', 'StudySession', 'User', 'Group', 'Achievement'];

    models.forEach(modelName => {
      try {
        const model = require(`./models/${modelName}`);
        model.createIndexes().then(() => {
          console.log(`✅ ${modelName} indexes created`);
        }).catch(err => {
          console.error(`❌ Error creating ${modelName} indexes:`, err);
        });
      } catch (error) {
        console.error(`❌ Error loading ${modelName} model:`, error);
      }
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
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    if (wsServer.io) {
      wsServer.io.close(() => {
        console.log('✅ WebSocket server closed');
      });
    } else if (wsServer.close) {
      await wsServer.close();
      console.log('✅ WebSocket server closed');
    }

    if (redis && redis.disconnect) {
      await redis.disconnect();
      console.log('✅ Redis connection closed');
    }

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');

    console.log('💥 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  gracefulShutdown();
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  gracefulShutdown();
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  const wsClients = wsServer.io ? wsServer.io.engine.clientsCount : 0;
  console.log(`🎯 StudySync Server is running on port ${PORT}`);
  console.log(`🔗 HTTP: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🧠 Redis: ${redis.isConnected ? 'Connected' : 'Disconnected'}`);
  console.log(`🔄 WebSocket: ${wsClients} clients connected`);
  console.log(`📚 Study Sessions: Enabled`);
  console.log(`🏆 Achievements System: Enabled`);
  console.log(`👥 Social Features: Enabled`);
});