// server/scripts/seedDemoData.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' }); // путь к .env в корне сервера

// Модели
const User = require('../models/User');
const Subject = require('../models/Subject');
const Group = require('../models/Group');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const StudySession = require('../models/StudySession');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const Friendship = require('../models/Friendship');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';

const demoUsers = [
  { name: 'Анна Смирнова', email: 'anna@studysync.demo', password: 'demo123', level: 15, experiencePoints: 4500, avatarUrl: 'https://i.pravatar.cc/150?img=1' },
  { name: 'Максим Петров', email: 'max@studysync.demo', password: 'demo123', level: 22, experiencePoints: 12000, avatarUrl: 'https://i.pravatar.cc/150?img=2' },
  { name: 'Елена Волкова', email: 'elena@studysync.demo', password: 'demo123', level: 8, experiencePoints: 1800, avatarUrl: 'https://i.pravatar.cc/150?img=3' },
  { name: 'Дмитрий Соколов', email: 'dmitry@studysync.demo', password: 'demo123', level: 30, experiencePoints: 35000, avatarUrl: 'https://i.pravatar.cc/150?img=4' },
  { name: 'Ольга Морозова', email: 'olga@studysync.demo', password: 'demo123', level: 12, experiencePoints: 3200, avatarUrl: 'https://i.pravatar.cc/150?img=5' },
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

    // Очистка существующих демо-данных (по email)
    const demoEmails = demoUsers.map(u => u.email);
    await User.deleteMany({ email: { $in: demoEmails } });
    await Subject.deleteMany({ name: { $in: subjectsData.map(s => s.name) } });
    // Удаляем связанные данные, чтобы не было мусора
    await Group.deleteMany({});
    await Flashcard.deleteMany({});
    await Note.deleteMany({});
    await StudySession.deleteMany({});
    await Friendship.deleteMany({});
    await UserAchievement.deleteMany({});
    console.log('🧹 Старые демо-данные удалены');

    // 1. Создаём пользователей
    const createdUsers = [];
    for (const u of demoUsers) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      const user = await User.create({
        name: u.name,
        email: u.email,
        password: hashedPassword,
        level: u.level,
        experiencePoints: u.experiencePoints,
        avatarUrl: u.avatarUrl,
        isActive: true,
      });
      createdUsers.push(user);
      console.log(`👤 Создан пользователь: ${user.name} (${user.email})`);
    }

    const [anna, max, elena, dmitry, olga] = createdUsers;

    // 2. Дружеские связи
    await Friendship.sendFriendRequest(anna._id, max._id);
    await Friendship.acceptFriendRequest(anna._id, max._id);
    await Friendship.sendFriendRequest(anna._id, elena._id);
    await Friendship.acceptFriendRequest(anna._id, elena._id);
    await Friendship.sendFriendRequest(max._id, dmitry._id);
    await Friendship.acceptFriendRequest(max._id, dmitry._id);
    await Friendship.sendFriendRequest(dmitry._id, olga._id);
    await Friendship.acceptFriendRequest(dmitry._id, olga._id);
    console.log('🤝 Дружеские связи созданы');

    // 3. Предметы
    const subjects = [];
    for (const sub of subjectsData) {
      const subject = await Subject.create({
        ...sub,
        createdBy: anna._id,
        isPublic: true,
      });
      subjects.push(subject);
    }
    console.log('📚 Предметы созданы');

    // 4. Группы
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

    // 5. Карточки
    const flashcards = [
      { question: '2 + 2 = ?', answer: '4', subjectId: subjects[0]._id, authorId: anna._id, groupId: mathGroup._id },
      { question: 'Производная от x^2', answer: '2x', subjectId: subjects[0]._id, authorId: max._id, groupId: mathGroup._id },
      { question: 'Что такое замыкание в JS?', answer: 'Функция, запоминающая своё лексическое окружение', subjectId: subjects[1]._id, authorId: dmitry._id, groupId: progGroup._id },
      { question: 'Как перевести "собака" на английский?', answer: 'dog', subjectId: subjects[2]._id, authorId: elena._id },
      { question: 'В каком году началась Вторая мировая война?', answer: '1939', subjectId: subjects[3]._id, authorId: olga._id },
    ];
    await Flashcard.insertMany(flashcards);
    console.log('🃏 Карточки созданы');

    // 6. Заметки
    const notes = [
      { title: 'План подготовки к экзамену', content: '1. Повторить производные. 2. Решить задачи на интегралы. 3. Пройти тест.', subjectId: subjects[0]._id, authorId: anna._id, groupId: mathGroup._id, tags: ['экзамен', 'план'] },
      { title: 'Полезные ссылки по JS', content: 'MDN, learn.javascript.ru, YouTube каналы...', subjectId: subjects[1]._id, authorId: dmitry._id, groupId: progGroup._id, tags: ['js', 'ссылки'] },
      { title: 'Неправильные глаголы', content: 'go - went - gone, do - did - done, ...', subjectId: subjects[2]._id, authorId: elena._id, tags: ['grammar'] },
    ];
    await Note.insertMany(notes);
    console.log('📝 Заметки созданы');

    // 7. Учебные сессии
    const session1 = await StudySession.create({
      name: 'Подготовка к контрольной по математике',
      description: 'Решаем задачи вместе',
      host: anna._id,
      subjectId: subjects[0]._id,
      groupId: mathGroup._id,
      accessType: 'friends',
      studyMode: 'collaborative',
      flashcards: (await Flashcard.find({ subjectId: subjects[0]._id })).map((f, idx) => ({ flashcardId: f._id, order: idx })),
      participants: [
        { user: anna._id, role: 'host', status: 'active' },
        { user: max._id, role: 'participant', status: 'active' },
      ],
      status: 'active',
    });

    const session2 = await StudySession.create({
      name: 'JS практика',
      host: dmitry._id,
      subjectId: subjects[1]._id,
      accessType: 'public',
      studyMode: 'individual',
      flashcards: (await Flashcard.find({ subjectId: subjects[1]._id })).map((f, idx) => ({ flashcardId: f._id, order: idx })),
      participants: [{ user: dmitry._id, role: 'host', status: 'active' }],
      status: 'waiting',
    });

    console.log('📅 Учебные сессии созданы');

    // 8. Достижения (разблокируем несколько для Анны)
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

    console.log('\n🎉 Демонстрационные данные успешно загружены!');
    console.log('------------------------------------------');
    console.log('Тестовые аккаунты (пароль у всех: demo123):');
    demoUsers.forEach(u => console.log(`  ${u.email}`));
    console.log('------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при сидинге:', error);
    process.exit(1);
  }
}

seed();