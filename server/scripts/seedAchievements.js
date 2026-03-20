// server/scripts/seedAchievements.js

const mongoose = require('mongoose');
require('dotenv').config();
const Achievement = require('../models/Achievement');

const achievements = [
  // === УЧЕБНЫЕ ДОСТИЖЕНИЯ ===
  {
    code: 'FIRST_FLASHCARD',
    name: 'Первая карточка',
    description: 'Создайте свою первую учебную карточку',
    icon: '📝',
    category: 'study',
    difficulty: 'bronze',
    points: 10,
    requirements: { type: 'create', target: 'flashcard', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 1
  },
  {
    code: 'FIRST_STUDY',
    name: 'Первое изучение',
    description: 'Изучите свою первую карточку',
    icon: '🎓',
    category: 'study',
    difficulty: 'bronze',
    points: 10,
    requirements: { type: 'study', target: 'flashcard', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 2
  },
  {
    code: 'STUDY_DILIGENT_10',
    name: 'Усердный ученик',
    description: 'Правильно ответьте на 10 карточек',
    icon: '📚',
    category: 'study',
    difficulty: 'silver',
    points: 30,
    requirements: { type: 'study_correct', target: 'flashcard', count: 10 },
    secret: false,
    isActive: true,
    sortOrder: 3
  },
  {
    code: 'STUDY_EXPERT_50',
    name: 'Эксперт обучения',
    description: 'Правильно ответьте на 50 карточек',
    icon: '🧠',
    category: 'study',
    difficulty: 'gold',
    points: 100,
    requirements: { type: 'study_correct', target: 'flashcard', count: 50 },
    secret: false,
    isActive: true,
    sortOrder: 4
  },
  {
    code: 'FLASHCARD_CREATOR_5',
    name: 'Создатель карточек',
    description: 'Создайте 5 учебных карточек',
    icon: '🖋️',
    category: 'study',
    difficulty: 'silver',
    points: 25,
    requirements: { type: 'create', target: 'flashcard', count: 5 },
    secret: false,
    isActive: true,
    sortOrder: 5
  },
  {
    code: 'FLASHCARD_MASTER_20',
    name: 'Мастер карточек',
    description: 'Создайте 20 учебных карточек',
    icon: '👨‍🏫',
    category: 'study',
    difficulty: 'gold',
    points: 75,
    requirements: { type: 'create', target: 'flashcard', count: 20 },
    secret: false,
    isActive: true,
    sortOrder: 6
  },
  {
    code: 'SUBJECT_MASTER',
    name: 'Мастер предмета',
    description: 'Изучите все карточки в предмете',
    icon: '🎯',
    category: 'study',
    difficulty: 'platinum',
    points: 150,
    requirements: { type: 'complete', target: 'subject', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 7
  },

  // === ГРУППОВЫЕ ДОСТИЖЕНИЯ ===
  {
    code: 'FIRST_GROUP',
    name: 'Первая группа',
    description: 'Создайте свою первую учебную группу',
    icon: '👥',
    category: 'group',
    difficulty: 'bronze',
    points: 20,
    requirements: { type: 'create', target: 'group', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 8
  },
  {
    code: 'GROUP_ORGANIZER_3',
    name: 'Организатор',
    description: 'Создайте 3 учебные группы',
    icon: '🎪',
    category: 'group',
    difficulty: 'silver',
    points: 50,
    requirements: { type: 'create', target: 'group', count: 3 },
    secret: false,
    isActive: true,
    sortOrder: 9
  },
  {
    code: 'SOCIAL_LEARNER',
    name: 'Социальный ученик',
    description: 'Присоединитесь к учебной группе',
    icon: '🤝',
    category: 'group',
    difficulty: 'bronze',
    points: 15,
    requirements: { type: 'join', target: 'group', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 10
  },
  {
    code: 'ACTIVE_MEMBER_3',
    name: 'Активный участник',
    description: 'Присоединитесь к 3 учебным группам',
    icon: '🌟',
    category: 'group',
    difficulty: 'silver',
    points: 40,
    requirements: { type: 'join', target: 'group', count: 3 },
    secret: false,
    isActive: true,
    sortOrder: 11
  },
  {
    code: 'FIRST_INVITE',
    name: 'Приглашающий',
    description: 'Пригласите первого участника в группу',
    icon: '📨',
    category: 'group',
    difficulty: 'bronze',
    points: 15,
    requirements: { type: 'invite', target: 'member', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 12
  },
  {
    code: 'MENTOR_5',
    name: 'Наставник',
    description: 'Пригласите 5 участников в группы',
    icon: '👨‍🏫',
    category: 'group',
    difficulty: 'gold',
    points: 80,
    requirements: { type: 'invite', target: 'member', count: 5 },
    secret: false,
    isActive: true,
    sortOrder: 13
  },

  // === ДОСТИЖЕНИЯ ДЛЯ ЗАМЕТОК ===
  {
    code: 'FIRST_NOTE',
    name: 'Первая заметка',
    description: 'Создайте свою первую учебную заметку',
    icon: '📓',
    category: 'note',
    difficulty: 'bronze',
    points: 10,
    requirements: { type: 'create', target: 'note', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 14
  },
  {
    code: 'NOTE_AUTHOR_5',
    name: 'Автор заметок',
    description: 'Создайте 5 учебных заметок',
    icon: '✍️',
    category: 'note',
    difficulty: 'silver',
    points: 30,
    requirements: { type: 'create', target: 'note', count: 5 },
    secret: false,
    isActive: true,
    sortOrder: 15
  },

  // === СОЦИАЛЬНЫЕ ДОСТИЖЕНИЯ ===
  {
    code: 'TEAM_PLAYER',
    name: 'Командный игрок',
    description: 'Создайте карточку в группе',
    icon: '🤲',
    category: 'social',
    difficulty: 'bronze',
    points: 20,
    requirements: { type: 'create', target: 'group_flashcard', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 16
  },
  {
    code: 'KNOWLEDGE_SHARER',
    name: 'Распространитель знаний',
    description: 'Создайте заметку в группе',
    icon: '📢',
    category: 'social',
    difficulty: 'bronze',
    points: 20,
    requirements: { type: 'create', target: 'group_note', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 17
  },

  // === СИСТЕМНЫЕ ДОСТИЖЕНИЯ ===
  {
    code: 'PROFILE_COMPLETE',
    name: 'Профиль завершен',
    description: 'Заполните полностью свой профиль',
    icon: '✅',
    category: 'system',
    difficulty: 'silver',
    points: 30,
    requirements: { type: 'complete', target: 'profile', percentage: 100 },
    secret: false,
    isActive: true,
    sortOrder: 18
  },
  {
    code: 'EARLY_ADOPTER',
    name: 'Ранний пользователь',
    description: 'Присоединитесь к платформе в течение первого месяца',
    icon: '🚀',
    category: 'system',
    difficulty: 'gold',
    points: 100,
    requirements: { type: 'early', target: 'user', days: 30 },
    secret: true,
    isActive: true,
    sortOrder: 19
  },
  {
    code: 'WEEK_STREAK_7',
    name: 'Неделя активности',
    description: 'Заходите в приложение 7 дней подряд',
    icon: '🔥',
    category: 'system',
    difficulty: 'gold',
    points: 70,
    requirements: { type: 'streak', target: 'login', days: 7 },
    secret: false,
    isActive: true,
    sortOrder: 20
  },
  {
    code: 'MONTH_STREAK_30',
    name: 'Месяц активности',
    description: 'Заходите в приложение 30 дней подряд',
    icon: '🏆',
    category: 'system',
    difficulty: 'platinum',
    points: 300,
    requirements: { type: 'streak', target: 'login', days: 30 },
    secret: false,
    isActive: true,
    sortOrder: 21
  },

  // === ДОСТИЖЕНИЯ ДЛЯ УЧЕБНЫХ СЕССИЙ ===
  {
    code: 'FIRST_STUDY_SESSION',
    name: 'Первая сессия',
    description: 'Создайте свою первую учебную сессию',
    icon: '🚀',
    category: 'study',
    difficulty: 'bronze',
    points: 20,
    requirements: { type: 'create', target: 'study_session', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 22
  },
  {
    code: 'STUDY_SESSION_CREATOR_5',
    name: 'Организатор сессий',
    description: 'Создайте 5 учебных сессий',
    icon: '🎯',
    category: 'study',
    difficulty: 'silver',
    points: 50,
    requirements: { type: 'create', target: 'study_session', count: 5 },
    secret: false,
    isActive: true,
    sortOrder: 23
  },
  {
    code: 'STUDY_SESSION_PARTICIPANT_5',
    name: 'Активный участник',
    description: 'Присоединитесь к 5 учебным сессиям',
    icon: '👥',
    category: 'study',
    difficulty: 'silver',
    points: 40,
    requirements: { type: 'join', target: 'study_session', count: 5 },
    secret: false,
    isActive: true,
    sortOrder: 24
  },
  {
    code: 'COLLABORATIVE_CARDS_100',
    name: 'Совместное обучение',
    description: 'Изучите 100 карточек в совместных сессиях',
    icon: '🤝',
    category: 'study',
    difficulty: 'gold',
    points: 100,
    requirements: { type: 'study', target: 'collaborative_cards', count: 100 },
    secret: false,
    isActive: true,
    sortOrder: 25
  },
  {
    code: 'POMODORO_MASTER',
    name: 'Мастер Pomodoro',
    description: 'Завершите полный цикл Pomodoro в учебной сессии',
    icon: '🍅',
    category: 'study',
    difficulty: 'silver',
    points: 60,
    requirements: { type: 'complete', target: 'pomodoro_cycle', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 26
  },
  {
    code: 'SESSION_COMPLETE_ALL_CARDS',
    name: 'Полное прохождение',
    description: 'Завершите сессию, изучив все карточки',
    icon: '🏁',
    category: 'study',
    difficulty: 'gold',
    points: 80,
    requirements: { type: 'complete', target: 'session_all_cards', count: 1 },
    secret: false,
    isActive: true,
    sortOrder: 27
  }
];

async function seedAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('✅ Connected to MongoDB');

    // Удаляем старые достижения
    await Achievement.deleteMany({});
    console.log('✅ Old achievements cleared');

    // Вставляем новые достижения
    const insertedAchievements = await Achievement.insertMany(achievements);
    console.log(`✅ Created ${insertedAchievements.length} achievements`);

    // Выводим статистику
    const statsByCategory = {};
    const statsByDifficulty = {};

    insertedAchievements.forEach(achievement => {
      statsByCategory[achievement.category] = (statsByCategory[achievement.category] || 0) + 1;
      statsByDifficulty[achievement.difficulty] = (statsByDifficulty[achievement.difficulty] || 0) + 1;
    });

    console.log('\n📊 Achievement Statistics:');
    console.log('By category:');
    Object.entries(statsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

    console.log('\nBy difficulty:');
    Object.entries(statsByDifficulty).forEach(([difficulty, count]) => {
      console.log(`  ${difficulty}: ${count}`);
    });

    const totalPoints = insertedAchievements.reduce((sum, a) => sum + a.points, 0);
    console.log(`\n💰 Total possible points: ${totalPoints}`);

    console.log('\n🎉 Achievement seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding achievements:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  seedAchievements();
}

module.exports = seedAchievements;