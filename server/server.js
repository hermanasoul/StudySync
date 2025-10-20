const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Создаем приложение Express
const app = express();

// Middleware
app.use(cors()); // Разрешаем запросы с фронтенда
app.use(express.json()); // Позволяем серверу понимать JSON

app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));

// Nестовый маршрут
app.get('/', (req, res) => {
  res.json({ 
    message: 'StudySync Backend is working! 🚀',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Маршрут для проверки API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running smoothly',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync')
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.log('❌ MongoDB connection error:', error);
  });

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎯 StudySync Server is running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});