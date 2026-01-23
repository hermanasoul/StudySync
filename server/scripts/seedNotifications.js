// server/scripts/seedNotifications.js

const mongoose = require('mongoose');
require('dotenv').config();
const Notification = require('../models/Notification');
const User = require('../models/User');

const notificationTypes = [
  'group_invitation',
  'group_join',
  'flashcard_created',
  'note_created',
  'study_reminder',
  'achievement',
  'system'
];

const notificationTitles = [
  'Приглашение в группу "Биология для начинающих"',
  'Новый участник в группе "Химия"',
  'Создана новая карточка',
  'Добавлена заметка о молекулярной биологии',
  'Напоминание: время повторить карточки',
  'Получено достижение "Активный участник"',
  'Системное обновление'
];

const notificationMessages = [
  'Вас пригласили присоединиться к группе для совместного изучения биологии.',
  'Иван Петров присоединился к вашей группе по химии.',
  'В группе "Математика" создана новая карточка по теме "Интегралы".',
  'Анна Смирнова добавила новую заметку о структуре ДНК.',
  'У вас есть 10 непросмотренных карточек, которые нужно повторить.',
  'Поздравляем! Вы получили достижение за активное участие в группах.',
  'Система была обновлена. Добавлены новые функции уведомлений.'
];

async function seedNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('✅ Connected to MongoDB');

    // Находим пользователей
    const users = await User.find().limit(5);
    
    if (users.length === 0) {
      console.log('❌ No users found. Please seed users first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} users`);

    // Удаляем старые тестовые уведомления
    await Notification.deleteMany({});
    console.log('✅ Old notifications cleared');

    // Создаем тестовые уведомления
    const notifications = [];
    const now = new Date();

    users.forEach((user, userIndex) => {
      // Создаем 3-5 уведомлений для каждого пользователя
      const notificationCount = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < notificationCount; i++) {
        const typeIndex = Math.floor(Math.random() * notificationTypes.length);
        const titleIndex = Math.floor(Math.random() * notificationTitles.length);
        const messageIndex = Math.floor(Math.random() * notificationMessages.length);
        
        // Случайная дата (от 1 до 30 дней назад)
        const daysAgo = 1 + Math.floor(Math.random() * 30);
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Случайно помечаем некоторые как прочитанные
        const isRead = Math.random() > 0.5;
        
        notifications.push({
          userId: user._id,
          type: notificationTypes[typeIndex],
          title: notificationTitles[titleIndex],
          message: notificationMessages[messageIndex],
          data: {
            test: true,
            userIndex,
            notificationIndex: i
          },
          isRead,
          isArchived: false,
          createdAt,
          updatedAt: createdAt
        });
      }
    });

    // Вставляем уведомления в базу данных
    await Notification.insertMany(notifications);
    console.log(`✅ Created ${notifications.length} test notifications`);

    // Подсчитываем статистику
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          byType: {
            $push: "$type"
          }
        }
      }
    ]);

    if (stats[0]) {
      console.log('\n📊 Notification Statistics:');
      console.log(`Total notifications: ${stats[0].total}`);
      console.log(`Unread notifications: ${stats[0].unread}`);
      console.log(`Read notifications: ${stats[0].total - stats[0].unread}`);
      
      // Подсчет по типам
      const typeCounts = {};
      stats[0].byType.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      console.log('\n📈 By type:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }

    console.log('\n🎉 Notification seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  seedNotifications();
}

module.exports = seedNotifications;
