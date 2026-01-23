// server/scripts/seedLevels.js

const mongoose = require('mongoose');
const UserLevel = require('../models/UserLevel');

const levels = [
  {
    level: 1,
    name: 'Новичок',
    description: 'Вы только начинаете свой путь в обучении',
    requiredPoints: 0,
    icon: '🌱',
    color: '#6b7280',
    unlocks: {}
  },
  {
    level: 2,
    name: 'Ученик',
    description: 'Делаете первые успехи в обучении',
    requiredPoints: 100,
    icon: '📚',
    color: '#3b82f6',
    unlocks: { badge: 'ученик' }
  },
  {
    level: 3,
    name: 'Исследователь',
    description: 'Активно изучаете новые темы',
    requiredPoints: 300,
    icon: '🔍',
    color: '#8b5cf6',
    unlocks: { badge: 'исследователь' }
  },
  {
    level: 4,
    name: 'Знаток',
    description: 'Обладаете глубокими знаниями',
    requiredPoints: 600,
    icon: '🎓',
    color: '#10b981',
    unlocks: { badge: 'знаток' }
  },
  {
    level: 5,
    name: 'Эксперт',
    description: 'Мастер в своей области',
    requiredPoints: 1000,
    icon: '👑',
    color: '#f59e0b',
    unlocks: { badge: 'эксперт' }
  },
  {
    level: 6,
    name: 'Магистр',
    description: 'Великий учитель и наставник',
    requiredPoints: 1500,
    icon: '🌟',
    color: '#ec4899',
    unlocks: { badge: 'магистр' }
  },
  {
    level: 7,
    name: 'Легенда',
    description: 'Ваши знания стали легендарными',
    requiredPoints: 2100,
    icon: '⚡',
    color: '#ef4444',
    unlocks: { badge: 'легенда' }
  },
  {
    level: 8,
    name: 'Мудрец',
    description: 'Обладаете мудростью веков',
    requiredPoints: 2800,
    icon: '🧙',
    color: '#7c3aed',
    unlocks: { badge: 'мудрец' }
  },
  {
    level: 9,
    name: 'Просветленный',
    description: 'Достигли высшего понимания',
    requiredPoints: 3600,
    icon: '💫',
    color: '#06b6d4',
    unlocks: { badge: 'просветленный' }
  },
  {
    level: 10,
    name: 'Мастер Вселенной',
    description: 'Покорили вершины знаний',
    requiredPoints: 4500,
    icon: '🌌',
    color: '#f97316',
    unlocks: { badge: 'мастер_вселенной' }
  }
];

// Генерация уровней до 100
for (let i = 11; i <= 100; i++) {
  const requiredPoints = 4500 + (i - 10) * 500;
  levels.push({
    level: i,
    name: `Уровень ${i}`,
    description: `Достижение уровня ${i}`,
    requiredPoints: requiredPoints,
    icon: i % 10 === 0 ? '🏆' : '⭐',
    color: `hsl(${(i * 3.6) % 360}, 70%, 50%)`,
    unlocks: i % 10 === 0 ? { badge: `level_${i}` } : {}
  });
}

async function seedLevels() {
  try {
    // Подключение к базе данных
    await mongoose.connect('mongodb://localhost:27017/studysync', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Подключение к базе данных установлено');
    
    // Очистка существующих уровней
    await UserLevel.deleteMany({});
    console.log('Существующие уровни удалены');
    
    // Добавление новых уровней
    await UserLevel.insertMany(levels);
    console.log(`Добавлено ${levels.length} уровней`);
    
    // Проверка
    const count = await UserLevel.countDocuments();
    console.log(`Всего уровней в базе: ${count}`);
    
    // Пример: получение уровня по очкам
    const testPoints = 750;
    const testLevel = await UserLevel.getLevelByPoints(testPoints);
    console.log(`При ${testPoints} очков уровень: ${testLevel.level} (${testLevel.name})`);
    
    mongoose.connection.close();
    console.log('Соединение закрыто');
    
  } catch (error) {
    console.error('Ошибка при заполнении уровней:', error);
    process.exit(1);
  }
}

seedLevels();