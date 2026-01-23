// server/scripts/initDB.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Subject = require('../models/Subject');
const Group = require('../models/Group');

async function initDB() {
  try {
    // Подключаемся к БД
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Очищаем коллекции (опционально, только для разработки)
    if (process.env.NODE_ENV === 'development') {
      await User.deleteMany({});
      await Subject.deleteMany({});
      await Group.deleteMany({});
      console.log('🗑️  Collections cleared');
    }

    // Создаем тестового пользователя
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Password123', salt);
    
    const testUser = await User.create({
      name: 'Тестовый Пользователь',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'student',
      avatarUrl: '',
      isActive: true
    });

    console.log(`👤 Test user created: ${testUser.email}`);

    // Создаем тестовые предметы
    const subjects = [
      {
        name: 'Биология',
        description: 'Изучение живых организмов и их взаимодействия с окружающей средой',
        color: 'green',
        icon: '🧬',
        createdBy: testUser._id,
        isPublic: true
      },
      {
        name: 'Химия',
        description: 'Изучение веществ, их свойств и превращений',
        color: 'blue',
        icon: '🧪',
        createdBy: testUser._id,
        isPublic: true
      },
      {
        name: 'Математика',
        description: 'Наука о количественных отношениях и пространственных формах',
        color: 'purple',
        icon: '📐',
        createdBy: testUser._id,
        isPublic: true
      },
      {
        name: 'Физика',
        description: 'Изучение фундаментальных законов природы',
        color: 'red',
        icon: '⚛️',
        createdBy: testUser._id,
        isPublic: true
      },
      {
        name: 'История',
        description: 'Изучение прошлого человечества',
        color: 'yellow',
        icon: '📜',
        createdBy: testUser._id,
        isPublic: true
      }
    ];

    const createdSubjects = await Subject.insertMany(subjects);
    console.log(`📚 ${createdSubjects.length} subjects created`);

    // Создаем тестовую группу
    const testGroup = await Group.create({
      name: 'Биология для начинающих',
      description: 'Изучаем основы биологии вместе',
      subjectId: createdSubjects[0]._id,
      createdBy: testUser._id,
      members: [{
        user: testUser._id,
        role: 'owner',
        joinedAt: new Date()
      }],
      isPublic: true,
      settings: {
        allowMemberInvites: true,
        allowMemberCreateCards: true,
        allowMemberCreateNotes: true
      }
    });

    console.log(`👥 Test group created: ${testGroup.name}`);
    console.log(`🔑 Group invite code: ${testGroup.inviteCode}`);

    console.log('\n🎉 Database initialization completed!');
    console.log('\n=== TEST CREDENTIALS ===');
    console.log('Email: test@example.com');
    console.log('Password: Password123');
    console.log('Group Invite Code:', testGroup.inviteCode);
    console.log('========================\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during database initialization:', error);
    process.exit(1);
  }
}

// Запускаем инициализацию
initDB();