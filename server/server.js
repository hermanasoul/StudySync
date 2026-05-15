const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
require('dotenv').config();
const path = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { cacheMiddleware } = require('./middleware/cache');
const redis = require('./config/redis');
const WebSocketServer = require('./websocket');
const AchievementTriggers = require('./services/achievementTriggers');

const app = express();
const server = http.createServer(app);

const wsServer = new WebSocketServer(server);
app.set('ws', wsServer);
app.set('achievementTriggers', new AchievementTriggers(wsServer));

// Временно отключаем Helmet для теста (если хотите, можно закомментировать)
// app.use(helmet({ ... }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Кэш с исключениями
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET' &&
      (req.path.startsWith('/flashcards/subject') ||
       req.path.startsWith('/notes/subject') ||
       req.path.startsWith('/friends') ||
       req.path.startsWith('/groups'))) {   // <-- исключаем группы
    return next();
  }
  cacheMiddleware(300)(req, res, next);
});

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true, customCss: '.swagger-ui .topbar { display: none }', customSiteTitle: 'StudySync API Docs' }));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

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

const chatsModule = require('./routes/chats');
app.use('/api/chats', chatsModule.router);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  const wsClients = wsServer.io ? wsServer.io.engine.clientsCount : 0;
  res.json({ message: 'StudySync Backend is working! 🚀', version: '1.4.0', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'development', features: { redis: redis.isConnected, websocket: wsClients, database: mongoose.connection.readyState === 1 } });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running smoothly', version: '1.4.0', services: { database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected', redis: redis.isConnected ? 'Connected' : 'Disconnected', websocket: { connectedClients: wsServer.io ? wsServer.io.engine.clientsCount : 0, status: 'Running' } }, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync', { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🎯 StudySync Server is running on port ${PORT}`);
      const ws = app.get('ws');
      chatsModule.schedulePendingMessages(ws);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

const gracefulShutdown = async () => {
  console.log('👋 Shutting down gracefully...');
  server.close();
  if (wsServer.io) wsServer.io.close();
  if (redis && redis.disconnect) await redis.disconnect().catch(console.error);
  await mongoose.connection.close();
  process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);