const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync';

async function seedExtraSubjects() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Подключено к MongoDB');

    // Находим демо-пользователя (Анну)
    const anna = await User.findOne({ email: 'anna@studysync.demo' });
    if (!anna) {
      console.error('❌ Демо-пользователь не найден. Сначала запустите seedDemoData.js');
      process.exit(1);
    }

    const newSubjects = [
      { name: 'Литература', description: 'Русская и зарубежная классика', color: 'purple', icon: '📚', createdBy: anna._id },
      { name: 'Биология', description: 'Основы клеточной теории', color: 'green', icon: '🧬', createdBy: anna._id },
      { name: 'Химия', description: 'Органическая химия', color: 'red', icon: '⚗️', createdBy: anna._id },
      { name: 'Информатика', description: 'Алгоритмы и структуры данных', color: 'blue', icon: '💻', createdBy: anna._id }
    ];

    for (const subj of newSubjects) {
      const exists = await Subject.findOne({ name: subj.name });
      if (!exists) {
        await Subject.create(subj);
        console.log(`✅ Предмет "${subj.name}" добавлен`);
      } else {
        console.log(`⏩ Предмет "${subj.name}" уже существует`);
      }
    }

    await mongoose.disconnect();
    console.log('✅ Дополнительные предметы успешно загружены');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

seedExtraSubjects();