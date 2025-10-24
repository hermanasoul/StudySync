const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// коллекции
const User = require('../models/User');
const Group = require('../models/Group'); // Предполагаем, есть модели для group, flashcard, subject
const Flashcard = require('../models/Flashcard');
const Subject = require('../models/Subject');

// Инициализация данных
async function initDB() {
  await Subject.create([{ name: 'Biology' }, { name: 'Math' }]); // Предметы
  await User.create([{ name: 'Test User', email: 'test@example.com', password: '123456' }]); // юзер
  console.log('DB initialized');
  mongoose.disconnect();
}
initDB();