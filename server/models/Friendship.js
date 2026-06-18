const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Отправитель обязателен'],
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Получатель обязателен'],
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  friendshipDate: Date,
  lastInteraction: { type: Date, default: Date.now }
}, { timestamps: true });

// Отправка запроса
friendshipSchema.statics.sendFriendRequest = async function(requesterId, recipientId) {
  if (requesterId.toString() === recipientId.toString()) {
    throw new Error('Нельзя добавить самого себя в друзья');
  }

  const existing = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });

  if (existing) {
    if (existing.status === 'pending') throw new Error('Заявка уже отправлена');
    if (existing.status === 'accepted') throw new Error('Вы уже друзья');
    if (existing.status === 'blocked') throw new Error('Невозможно отправить заявку');
    // повторная отправка после reject
    existing.status = 'pending';
    existing.requester = requesterId;
    existing.recipient = recipientId;
    existing.friendshipDate = null;
    existing.lastInteraction = new Date();
    return existing.save();
  }

  return this.create({ requester: requesterId, recipient: recipientId, status: 'pending' });
};

// Принятие запроса
friendshipSchema.statics.acceptFriendRequest = async function(friendshipId, userId) {
  const friendship = await this.findOne({ _id: friendshipId, recipient: userId, status: 'pending' });
  if (!friendship) throw new Error('Заявка не найдена или уже обработана');

  friendship.status = 'accepted';
  friendship.friendshipDate = new Date();
  friendship.lastInteraction = new Date();
  await friendship.save();

  // Обновляем массивы friends у пользователей (если поле существует)
  const User = require('./User');
  await User.findByIdAndUpdate(friendship.requester, {
    $addToSet: { friends: { userId: friendship.recipient, friendshipId: friendship._id } }
  });
  await User.findByIdAndUpdate(friendship.recipient, {
    $addToSet: { friends: { userId: friendship.requester, friendshipId: friendship._id } }
  });

  return friendship;
};

friendshipSchema.index({ requester: 1, recipient: 1 });
friendshipSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Friendship', friendshipSchema);