const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
require('dotenv').config();

const socialAchievements = [
  {
    code: 'FIRST_FRIEND',
    name: 'Первый друг',
    description: 'Добавьте первого друга в StudySync',
    icon: '🤝',
    category: 'social',
    difficulty: 'bronze',
    difficultyClass: 'bronze',
    difficultyColor: '#cd7f32',
    points: 100,
    requirements: {
      type: 'friends_count',
      target: 1
    },
    secret: false
  },
  {
    code: 'FRIENDS_5',
    name: 'Социальная бабочка',
    description: 'Добавьте 5 друзей',
    icon: '🦋',
    category: 'social',
    difficulty: 'silver',
    difficultyClass: 'silver',
    difficultyColor: '#c0c0c0',
    points: 250,
    requirements: {
      type: 'friends_count',
      target: 5
    },
    secret: false
  },
  {
    code: 'FRIENDS_10',
    name: 'Душа компании',
    description: 'Добавьте 10 друзей',
    icon: '🌟',
    category: 'social',
    difficulty: 'gold',
    difficultyClass: 'gold',
    difficultyColor: '#ffd700',
    points: 500,
    requirements: {
      type: 'friends_count',
      target: 10
    },
    secret: false
  },
  {
    code: 'FOLLOWERS_10',
    name: 'Популярный',
    description: 'Получите 10 подписчиков',
    icon: '👑',
    category: 'social',
    difficulty: 'silver',
    difficultyClass: 'silver',
    difficultyColor: '#c0c0c0',
    points: 300,
    requirements: {
      type: 'followers_count',
      target: 10
    },
    secret: false
  },
  {
    code: 'FOLLOWERS_50',
    name: 'Звезда StudySync',
    description: 'Получите 50 подписчиков',
    icon: '⭐',
    category: 'social',
    difficulty: 'gold',
    difficultyClass: 'gold',
    difficultyColor: '#ffd700',
    points: 750,
    requirements: {
      type: 'followers_count',
      target: 50
    },
    secret: false
  },
  {
    code: 'LEADERBOARD_TOP_10',
    name: 'В десятке лучших',
    description: 'Попадите в топ-10 глобального лидерборда',
    icon: '🏅',
    category: 'social',
    difficulty: 'silver',
    difficultyClass: 'silver',
    difficultyColor: '#c0c0c0',
    points: 400,
    requirements: {
      type: 'leaderboard_position',
      target: 10,
      metric: 'experience'
    },
    secret: false
  },
  {
    code: 'LEADERBOARD_TOP_1',
    name: 'Чемпион',
    description: 'Займите первое место в глобальном лидерборде',
    icon: '🏆',
    category: 'social',
    difficulty: 'platinum',
    difficultyClass: 'platinum',
    difficultyColor: '#e5e4e2',
    points: 1000,
    requirements: {
      type: 'leaderboard_position',
      target: 1,
      metric: 'experience'
    },
    secret: false
  },
  {
    code: 'GROUP_LEADER',
    name: 'Лидер группы',
    description: 'Создайте группу и пригласите в неё участников',
    icon: '👥',
    category: 'social',
    difficulty: 'bronze',
    difficultyClass: 'bronze',
    difficultyColor: '#cd7f32',
    points: 150,
    requirements: {
      type: 'group_creation'
    },
    secret: false
  },
  {
    code: 'STREAK_7_SOCIAL',
    name: 'Социальная активность',
    description: 'Будьте активны в течение 7 дней подряд',
    icon: '🔥',
    category: 'social',
    difficulty: 'bronze',
    difficultyClass: 'bronze',
    difficultyColor: '#cd7f32',
    points: 200,
    requirements: {
      type: 'streak',
      target: 7
    },
    secret: false
  }
];

async function seedSocialAchievements() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('✅ Подключение к MongoDB успешно');

    let createdCount = 0;
    let updatedCount = 0;

    // Создаем или обновляем достижения
    for (const achievementData of socialAchievements) {
      const existing = await Achievement.findOne({ code: achievementData.code });
      
      if (existing) {
        // Обновляем существующее достижение
        await Achievement.findByIdAndUpdate(existing._id, achievementData);
        updatedCount++;
        console.log(`🔄 Обновлено достижение: ${achievementData.name}`);
      } else {
        // Создаем новое достижение
        await Achievement.create(achievementData);
        createdCount++;
        console.log(`✅ Создано достижение: ${achievementData.name}`);
      }
    }

    console.log(`\n🎉 Сидинг завершен!`);
    console.log(`✅ Создано: ${createdCount} достижений`);
    console.log(`🔄 Обновлено: ${updatedCount} достижений`);
    
    // Закрываем соединение
    await mongoose.connection.close();
    console.log('👋 Соединение с MongoDB закрыто');
    
  } catch (error) {
    console.error('❌ Ошибка сидинга:', error);
    process.exit(1);
  }
}

// Запускаем сидинг
seedSocialAchievements();