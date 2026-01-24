const mongoose = require('mongoose');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Follow = require('../models/Follow');
require('dotenv').config();

async function updateSocialStats() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
    console.log('✅ Подключение к MongoDB успешно');

    // Получаем всех пользователей
    const users = await User.find({});
    console.log(`📊 Найдено ${users.length} пользователей`);

    let updatedCount = 0;

    // Для каждого пользователя обновляем социальную статистику
    for (const user of users) {
      try {
        // Получаем количество друзей
        const friendCount = await Friendship.countDocuments({
          $or: [
            { requester: user._id, status: 'accepted' },
            { recipient: user._id, status: 'accepted' }
          ]
        });

        // Получаем количество подписчиков
        const followerCount = await Follow.countDocuments({
          following: user._id
        });

        // Получаем количество подписок
        const followingCount = await Follow.countDocuments({
          follower: user._id
        });

        // Обновляем пользователя
        await User.findByIdAndUpdate(user._id, {
          $set: {
            'socialStats.followerCount': followerCount,
            'socialStats.followingCount': followingCount,
            'socialStats.friendCount': friendCount,
            'socialStats.lastActivity': user.lastLogin || new Date()
          }
        });

        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`🔄 Обновлено ${updatedCount} пользователей`);
        }
      } catch (error) {
        console.error(`❌ Ошибка обновления пользователя ${user._id}:`, error.message);
      }
    }

    console.log(`🎉 Миграция завершена! Обновлено ${updatedCount} пользователей`);
    
    // Закрываем соединение
    await mongoose.connection.close();
    console.log('👋 Соединение с MongoDB закрыто');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

// Запускаем миграцию
updateSocialStats();