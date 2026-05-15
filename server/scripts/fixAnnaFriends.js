const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
  const anna = await User.findOne({ email: 'anna@studysync.demo' });
  const max = await User.findOne({ email: 'max@studysync.demo' });
  const elena = await User.findOne({ email: 'elena@studysync.demo' });

  if (!anna || !max || !elena) {
    console.error('❌ Не найдены все пользователи');
    process.exit(1);
  }

  // На всякий случай удаляем все дружбы Анны
  await Friendship.deleteMany({
    $or: [
      { requester: anna._id },
      { recipient: anna._id }
    ]
  });

  // Анна ↔ Максим
  const req1 = await Friendship.sendFriendRequest(anna._id, max._id);
  await Friendship.acceptFriendRequest(req1._id, max._id);

  // Анна ↔ Елена
  const req2 = await Friendship.sendFriendRequest(anna._id, elena._id);
  await Friendship.acceptFriendRequest(req2._id, elena._id);

  console.log('✅ Друзья Анны исправлены');
  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });