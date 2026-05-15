// server/scripts/seedDemoData.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const User = require('../models/User');
const Subject = require('../models/Subject');
const Group = require('../models/Group');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const StudySession = require('../models/StudySession');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';

const demoUsers = [
  { name: 'Анна Смирнова', email: 'anna@studysync.demo', password: 'Demo123!', level: 15, experiencePoints: 4500, avatarUrl: 'https://i.pravatar.cc/150?img=1' },
  { name: 'Максим Петров',   email: 'max@studysync.demo',   password: 'Demo123!', level: 22, experiencePoints: 12000, avatarUrl: 'https://i.pravatar.cc/150?img=2' },
  { name: 'Елена Волкова',   email: 'elena@studysync.demo', password: 'Demo123!', level: 8,  experiencePoints: 1800,  avatarUrl: 'https://i.pravatar.cc/150?img=3' },
  { name: 'Дмитрий Соколов', email: 'dmitry@studysync.demo', password: 'Demo123!', level: 30, experiencePoints: 35000, avatarUrl: 'https://i.pravatar.cc/150?img=4' },
  { name: 'Ольга Морозова',  email: 'olga@studysync.demo',  password: 'Demo123!', level: 12, experiencePoints: 3200,  avatarUrl: 'https://i.pravatar.cc/150?img=5' },
];

const subjectsData = [
  { name: 'Математика', description: 'Алгебра, геометрия, матанализ', color: 'blue', icon: '📐' },
  { name: 'Программирование', description: 'JavaScript, Python, алгоритмы', color: 'green', icon: '💻' },
  { name: 'Английский язык', description: 'Грамматика, лексика, разговорная практика', color: 'purple', icon: '🇬🇧' },
  { name: 'История', description: 'Всемирная история и история России', color: 'orange', icon: '📜' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');

    // Удаляем старых демо-пользователей
    await User.deleteMany({ email: { $in: demoUsers.map(u => u.email) } });
    await Subject.deleteMany({});
    await Group.deleteMany({});
    await Flashcard.deleteMany({});
    await Note.deleteMany({});
    await StudySession.deleteMany({});
    await UserAchievement.deleteMany({});
    console.log('🧹 Старые данные удалены');

    // 1. Пользователи
    const createdUsers = [];
    for (const u of demoUsers) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password: u.password,
        level: u.level,
        experiencePoints: u.experiencePoints,
        avatarUrl: u.avatarUrl,
        isActive: true,
      });
      createdUsers.push(user);
      console.log(`👤 ${user.name}`);
    }

    const [anna, max, elena, dmitry, olga] = createdUsers;

    // 2. Предметы
    const subjects = [];
    for (const sub of subjectsData) {
      const subject = await Subject.create({ ...sub, createdBy: anna._id, isPublic: true });
      subjects.push(subject);
    }
    console.log('📚 Предметы созданы');

    // 3. Группы
    const mathGroup = await Group.create({
      name: 'Математический кружок',
      description: 'Решаем задачи и готовимся к экзаменам',
      subjectId: subjects[0]._id,
      createdBy: anna._id,
      isPublic: true,
      members: [
        { user: anna._id, role: 'owner' },
        { user: max._id, role: 'admin' },
        { user: elena._id, role: 'member' },
      ],
    });
    const progGroup = await Group.create({
      name: 'JS Разработчики',
      description: 'Обсуждаем JavaScript, React, Node.js',
      subjectId: subjects[1]._id,
      createdBy: dmitry._id,
      isPublic: true,
      members: [
        { user: dmitry._id, role: 'owner' },
        { user: olga._id, role: 'member' },
        { user: max._id, role: 'member' },
      ],
    });
    console.log('👥 Группы созданы');

    // 4. Карточки
    await Flashcard.insertMany([
      { question: '2 + 2 = ?', answer: '4', subjectId: subjects[0]._id, authorId: anna._id, groupId: mathGroup._id },
      { question: 'Производная от x^2', answer: '2x', subjectId: subjects[0]._id, authorId: max._id, groupId: mathGroup._id },
      { question: 'Что такое замыкание в JS?', answer: 'Функция, запоминающая своё лексическое окружение', subjectId: subjects[1]._id, authorId: dmitry._id, groupId: progGroup._id },
      { question: 'Как перевести "собака" на английский?', answer: 'dog', subjectId: subjects[2]._id, authorId: elena._id },
      { question: 'В каком году началась Вторая мировая война?', answer: '1939', subjectId: subjects[3]._id, authorId: olga._id },
    ]);
    console.log('🃏 Карточки созданы');

    // 5. Заметки
    await Note.insertMany([
      { title: 'План подготовки к экзамену', content: '1. Повторить производные. 2. Решить задачи на интегралы.', subjectId: subjects[0]._id, authorId: anna._id, groupId: mathGroup._id, tags: ['экзамен'] },
      { title: 'Полезные ссылки по JS', content: 'MDN, learn.javascript.ru', subjectId: subjects[1]._id, authorId: dmitry._id, groupId: progGroup._id, tags: ['js'] },
      { title: 'Неправильные глаголы', content: 'go - went - gone, do - did - done', subjectId: subjects[2]._id, authorId: elena._id, tags: ['grammar'] },
    ]);
    console.log('📝 Заметки созданы');

    // 6. Учебные сессии
    const mathCards = await Flashcard.find({ subjectId: subjects[0]._id });
    await StudySession.create({
      name: 'Подготовка к контрольной по математике',
      host: anna._id,
      subjectId: subjects[0]._id,
      groupId: mathGroup._id,
      accessType: 'friends',
      studyMode: 'collaborative',
      flashcards: mathCards.map((c, idx) => ({ flashcardId: c._id, order: idx })),
      participants: [
        { user: anna._id, role: 'host', status: 'active' },
        { user: max._id, role: 'participant', status: 'active' },
      ],
      status: 'active',
    });

    const jsCards = await Flashcard.find({ subjectId: subjects[1]._id });
    await StudySession.create({
      name: 'JS практика',
      host: dmitry._id,
      subjectId: subjects[1]._id,
      accessType: 'public',
      studyMode: 'individual',
      flashcards: jsCards.map((c, idx) => ({ flashcardId: c._id, order: idx })),
      participants: [{ user: dmitry._id, role: 'host', status: 'active' }],
      status: 'waiting',
    });
    console.log('📅 Учебные сессии созданы');

    // 7. Достижения
    const achievements = await Achievement.find({ isActive: true }).limit(5);
    for (const ach of achievements.slice(0, 3)) {
      await UserAchievement.create({
        userId: anna._id,
        achievementId: ach._id,
        progress: 100,
        isUnlocked: true,
        unlockedAt: new Date(),
      });
    }
    console.log('🏆 Достижения разблокированы');

    console.log('\n🎉 Демо-данные загружены!');
    console.log('Тестовые аккаунты (пароль у всех: Demo123!):');
    demoUsers.forEach(u => console.log(`  ${u.email}`));
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка сидинга:', error);
    process.exit(1);
  }
}

seed();