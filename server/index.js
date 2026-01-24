const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Импорт роутов
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const flashcardRoutes = require('./routes/flashcards');
const noteRoutes = require('./routes/notes');
const subjectRoutes = require('./routes/subjects');
const achievementRoutes = require('./routes/achievements');
const levelRoutes = require('./routes/levels');
const notificationRoutes = require('./routes/notifications');
const badgeRoutes = require('./routes/badges');
const questRoutes = require('./routes/quests');
const rewardRoutes = require('./routes/rewards');
// Новые маршруты для социальных функций
const friendsRoutes = require('./routes/friends');
const followsRoutes = require('./routes/follows');
const leaderboardsRoutes = require('./routes/leaderboards');

// Импорт middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Безопасность и производительность
app.use(helmet());
app.use(compression());

// Лимитер запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // лимит 100 запросов с одного IP
  message: 'Слишком много запросов с этого IP, попробуйте позже'
});
app.use('/api/', limiter);

// Парсинг JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS настройки
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB подключена успешно'))
  .catch((err) => {
    console.error('❌ Ошибка подключения к MongoDB:', err);
    process.exit(1);
  });

// WebSocket инициализация
const { createServer } = require('http');
const { Server } = require('socket.io');
const webSocketService = require('./services/websocket');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Инициализация WebSocket сервиса
webSocketService.init(io);

// Статические файлы (если нужно)
app.use('/uploads', express.static('uploads'));

// Основной маршрут
app.get('/', (req, res) => {
  res.json({
    message: 'Добро пожаловать в StudySync API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      groups: '/api/groups',
      flashcards: '/api/flashcards',
      notes: '/api/notes',
      subjects: '/api/subjects',
      achievements: '/api/achievements',
      levels: '/api/levels',
      notifications: '/api/notifications',
      badges: '/api/badges',
      quests: '/api/quests',
      rewards: '/api/rewards',
      friends: '/api/friends',
      follows: '/api/follows',
      leaderboards: '/api/leaderboards'
    }
  });
});

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/rewards', rewardRoutes);
// Новые социальные маршруты
app.use('/api/friends', friendsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/leaderboards', leaderboardsRoutes);

// 404 обработчик
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Маршрут не найден'
  });
});

// Обработчик ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступно по адресу: http://localhost:${PORT}`);
  console.log(`🌐 WebSocket доступен на: ws://localhost:${PORT}`);
  console.log(`👥 Социальные функции: Включены`);
});

// Обработка необработанных обещаний
process.on('unhandledRejection', (err) => {
  console.error('❌ Необработанное обещание:', err);
  // Закрываем сервер и выходим
  httpServer.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Получен SIGTERM. Завершение работы...');
  httpServer.close(() => {
    console.log('✅ HTTP сервер закрыт');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB соединение закрыто');
      process.exit(0);
    });
  });
});

module.exports = app;