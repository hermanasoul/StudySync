// server/scripts/seedLevelsWithRewards.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const UserLevel = require('../models/UserLevel');

dotenv.config();

const levelsWithRewards = [
  {
    level: 1,
    name: 'Новичок',
    description: 'Добро пожаловать в StudySync! Начните свой путь к знаниям.',
    requiredPoints: 0,
    icon: '👶',
    color: '#6b7280',
    unlocks: {
      themes: ['default'],
      avatarEffects: ['none'],
      badgeFrames: ['none'],
      specialAbilities: ['daily_quests']
    }
  },
  {
    level: 2,
    name: 'Ученик',
    description: 'Вы делаете первые успехи в обучении. Продолжайте в том же духе!',
    requiredPoints: 100,
    icon: '📚',
    color: '#10b981',
    unlocks: {
      badgeFrames: ['bronze-frame']
    }
  },
  {
    level: 3,
    name: 'Любознательный',
    description: 'Ваше любопытство ведет вас вперед. Исследуйте новые горизонты!',
    requiredPoints: 300,
    icon: '🔍',
    color: '#3b82f6',
    unlocks: {
      avatarEffects: ['sparkle'],
      specialAbilities: ['weekly_quests']
    }
  },
  {
    level: 5,
    name: 'Энтузиаст',
    description: 'Ваш энтузиазм заразителен. Вы становитесь примером для других!',
    requiredPoints: 1000,
    icon: '🌟',
    color: '#f59e0b',
    unlocks: {
      themes: ['dark'],
      specialAbilities: ['monthly_quests']
    }
  },
  {
    level: 10,
    name: 'Мастер',
    description: 'Вы достигли мастерства в учебе. Ваш опыт впечатляет!',
    requiredPoints: 5000,
    icon: '👑',
    color: '#8b5cf6',
    unlocks: {
      themes: ['premium'],
      avatarEffects: ['fire'],
      badgeFrames: ['silver-frame'],
      specialAbilities: ['custom_themes']
    }
  },
  {
    level: 15,
    name: 'Эксперт',
    description: 'Ваши знания глубоки и обширны. Вы истинный эксперт!',
    requiredPoints: 15000,
    icon: '🎓',
    color: '#ec4899',
    unlocks: {
      themes: ['gradient'],
      avatarEffects: ['halo'],
      specialAbilities: ['priority_support']
    }
  },
  {
    level: 20,
    name: 'Легенда',
    description: 'Ваше имя будет помнить поколения студентов. Вы легенда StudySync!',
    requiredPoints: 30000,
    icon: '⚡',
    color: '#f97316',
    unlocks: {
      themes: ['nebula'],
      avatarEffects: ['rainbow'],
      badgeFrames: ['gold-frame'],
      specialAbilities: ['advanced_analytics']
    }
  },
  {
    level: 25,
    name: 'Мудрец',
    description: 'Ваша мудрость безгранична. Вы достигли вершин знаний!',
    requiredPoints: 50000,
    icon: '🧙',
    color: '#6366f1',
    unlocks: {
      themes: ['sunset'],
      avatarEffects: ['pulse'],
      specialAbilities: ['unlimited_groups']
    }
  },
  {
    level: 30,
    name: 'Просветленный',
    description: 'Вы достигли просветления в знаниях. Ваш путь вдохновляет всех!',
    requiredPoints: 75000,
    icon: '✨',
    color: '#06b6d4',
    unlocks: {
      themes: ['forest', 'ocean'],
      badgeFrames: ['platinum-frame', 'crystal-frame']
    }
  },
  {
    level: 40,
    name: 'Хранитель знаний',
    description: 'Вы храните мудрость веков и делитесь ею с миром.',
    requiredPoints: 150000,
    icon: '📖',
    color: '#8b5cf6',
    unlocks: {
      profileBackgrounds: ['particles', 'gradient-animated']
    }
  },
  {
    level: 50,
    name: 'Вершина',
    description: 'Вы достигли вершины мастерства. Ваше имя навсегда в истории StudySync!',
    requiredPoints: 250000,
    icon: '🏔️',
    color: '#f59e0b',
    unlocks: {
      profileBackgrounds: ['stars', 'geometric']
    }
  }
];

const seedLevelsWithRewards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('Connected to MongoDB');

    // Очищаем существующие уровни
    await UserLevel.deleteMany({});
    console.log('Cleared existing levels');

    // Добавляем уровни с наградами
    for (const levelData of levelsWithRewards) {
      const level = new UserLevel(levelData);
      await level.save();
      console.log(`Created level: ${level.level} - ${level.name}`);
    }

    // Создаем остальные уровни (без особых наград)
    for (let i = 1; i <= 100; i++) {
      if (!levelsWithRewards.find(l => l.level === i)) {
        const points = Math.floor(100 * Math.pow(1.5, i - 1));
        const level = new UserLevel({
          level: i,
          name: `Уровень ${i}`,
          description: `Достижение уровня ${i} в StudySync`,
          requiredPoints: points,
          icon: i % 10 === 0 ? '⭐' : '🔹',
          color: i % 10 === 0 ? '#f59e0b' : '#6b7280',
          unlocks: {}
        });
        await level.save();
        console.log(`Created basic level: ${i}`);
      }
    }

    console.log('✅ All levels seeded successfully!');
    console.log(`Total levels: 100`);
    console.log(`Levels with special rewards: ${levelsWithRewards.length}`);

    // Показываем информацию о наградах
    console.log('\n🎁 Special Rewards by Level:');
    levelsWithRewards.forEach(level => {
      console.log(`\nLevel ${level.level} - ${level.name}:`);
      if (level.unlocks.themes?.length) {
        console.log(`  Themes: ${level.unlocks.themes.join(', ')}`);
      }
      if (level.unlocks.avatarEffects?.length) {
        console.log(`  Avatar Effects: ${level.unlocks.avatarEffects.join(', ')}`);
      }
      if (level.unlocks.badgeFrames?.length) {
        console.log(`  Badge Frames: ${level.unlocks.badgeFrames.join(', ')}`);
      }
      if (level.unlocks.specialAbilities?.length) {
        console.log(`  Special Abilities: ${level.unlocks.specialAbilities.join(', ')}`);
      }
      if (level.unlocks.profileBackgrounds?.length) {
        console.log(`  Profile Backgrounds: ${level.unlocks.profileBackgrounds.join(', ')}`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding levels:', error);
    process.exit(1);
  }
};

seedLevelsWithRewards();