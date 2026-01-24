// server/scripts/seedQuests.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Quest = require('../models/Quest');

dotenv.config();

const dailyQuests = [
  {
    code: 'DAILY_LOGIN',
    name: 'Ежедневный вход',
    description: 'Зайдите в приложение сегодня',
    icon: '📱',
    type: 'daily',
    category: 'system',
    difficulty: 'easy',
    points: 50,
    requirements: { action: 'login', count: 1 },
    rewards: { experience: 25, coins: 10 },
    timeLimit: 24,
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 1
  },
  {
    code: 'DAILY_FLASHCARDS_5',
    name: 'Повторение карточек',
    description: 'Повторите 5 карточек за день',
    icon: '📚',
    type: 'daily',
    category: 'flashcard',
    difficulty: 'medium',
    points: 100,
    requirements: { action: 'review_flashcards', count: 5 },
    rewards: { experience: 50, coins: 20 },
    timeLimit: 24,
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 2
  },
  {
    code: 'DAILY_GROUP_ACTIVITY',
    name: 'Активность в группах',
    description: 'Посетите любую группу сегодня',
    icon: '👥',
    type: 'daily',
    category: 'group',
    difficulty: 'easy',
    points: 75,
    requirements: { action: 'visit_group', count: 1 },
    rewards: { experience: 35, coins: 15 },
    timeLimit: 24,
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 3
  },
  {
    code: 'DAILY_NOTE_CREATE',
    name: 'Создатель заметок',
    description: 'Создайте новую заметку',
    icon: '📝',
    type: 'daily',
    category: 'note',
    difficulty: 'medium',
    points: 120,
    requirements: { action: 'create_note', count: 1 },
    rewards: { experience: 60, coins: 25 },
    timeLimit: 24,
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 4
  },
  {
    code: 'DAILY_STUDY_30',
    name: '30 минут учёбы',
    description: 'Занимайтесь учёбой не менее 30 минут',
    icon: '⏰',
    type: 'daily',
    category: 'study',
    difficulty: 'hard',
    points: 150,
    requirements: { action: 'study_time', count: 30 }, // 30 минут
    rewards: { experience: 75, coins: 30 },
    timeLimit: 24,
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 5
  }
];

const weeklyQuests = [
  {
    code: 'WEEKLY_ACHIEVEMENT_3',
    name: 'Коллекционер достижений',
    description: 'Получите 3 новых достижения за неделю',
    icon: '🏆',
    type: 'weekly',
    category: 'system',
    difficulty: 'hard',
    points: 500,
    requirements: { action: 'unlock_achievements', count: 3 },
    rewards: { experience: 250, coins: 100 },
    timeLimit: 168, // 7 дней
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 10
  },
  {
    code: 'WEEKLY_FLASHCARDS_50',
    name: 'Мастер карточек',
    description: 'Повторите 50 карточек за неделю',
    icon: '🎴',
    type: 'weekly',
    category: 'flashcard',
    difficulty: 'expert',
    points: 800,
    requirements: { action: 'review_flashcards', count: 50 },
    rewards: { experience: 400, coins: 150 },
    timeLimit: 168,
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 11
  }
];

const monthlyQuests = [
  {
    code: 'MONTHLY_STREAK_20',
    name: 'Железная воля',
    description: 'Поддерживайте серию активности 20 дней подряд',
    icon: '🔥',
    type: 'monthly',
    category: 'system',
    difficulty: 'expert',
    points: 1500,
    requirements: { action: 'maintain_streak', count: 20 },
    rewards: { experience: 750, coins: 300 },
    timeLimit: 720, // 30 дней
    repeatable: true,
    maxCompletions: 1,
    sortOrder: 20
  }
];

const specialQuests = [
  {
    code: 'FIRST_GROUP_CREATE',
    name: 'Основатель',
    description: 'Создайте свою первую группу',
    icon: '👑',
    type: 'special',
    category: 'group',
    difficulty: 'medium',
    points: 300,
    requirements: { action: 'create_group', count: 1 },
    rewards: { experience: 150, coins: 50 },
    timeLimit: 0,
    repeatable: false,
    maxCompletions: 1,
    sortOrder: 30
  },
  {
    code: 'FIRST_FLASHCARD_SET',
    name: 'Первый набор',
    description: 'Создайте набор из 10 карточек',
    icon: '💭',
    type: 'special',
    category: 'flashcard',
    difficulty: 'medium',
    points: 400,
    requirements: { action: 'create_flashcards', count: 10 },
    rewards: { experience: 200, coins: 75 },
    timeLimit: 0,
    repeatable: false,
    maxCompletions: 1,
    sortOrder: 31
  }
];

const seedQuests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('Connected to MongoDB');

    // Очищаем существующие задания
    await Quest.deleteMany({});
    console.log('Cleared existing quests');

    // Добавляем все задания
    const allQuests = [...dailyQuests, ...weeklyQuests, ...monthlyQuests, ...specialQuests];
    
    for (const questData of allQuests) {
      const quest = new Quest(questData);
      await quest.save();
      console.log(`Created quest: ${quest.name} (${quest.code})`);
    }

    console.log('✅ All quests seeded successfully!');
    console.log(`Total quests: ${allQuests.length}`);
    console.log(`Daily: ${dailyQuests.length}`);
    console.log(`Weekly: ${weeklyQuests.length}`);
    console.log(`Monthly: ${monthlyQuests.length}`);
    console.log(`Special: ${specialQuests.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding quests:', error);
    process.exit(1);
  }
};

seedQuests();