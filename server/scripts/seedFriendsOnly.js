const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync');
  const users = await User.find({
    email: { $in: ['anna@studysync.demo','max@studysync.demo','elena@studysync.demo','dmitry@studysync.demo','olga@studysync.demo'] }
  });
  const [anna, max, elena, dmitry, olga] = users;

  // Анна ↔ Максим
  let r1 = await Friendship.sendFriendRequest(anna._id, max._id);
  await Friendship.acceptFriendRequest(r1._id, max._id);
  // Анна ↔ Елена
  let r2 = await Friendship.sendFriendRequest(anna._id, elena._id);
  await Friendship.acceptFriendRequest(r2._id, elena._id);
  // Максим ↔ Дмитрий
  let r3 = await Friendship.sendFriendRequest(max._id, dmitry._id);
  await Friendship.acceptFriendRequest(r3._id, dmitry._id);
  // Дмитрий ↔ Ольга
  let r4 = await Friendship.sendFriendRequest(dmitry._id, olga._id);
  await Friendship.acceptFriendRequest(r4._id, olga._id);

  console.log('✅ Корректные друзья созданы');
  process.exit(0);
}
seed();