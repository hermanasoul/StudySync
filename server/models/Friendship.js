const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID отправителя обязательно'],
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID получателя обязательно'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'rejected', 'blocked'],
      message: 'Статус должен быть: pending, accepted, rejected или blocked'
    },
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Составной уникальный индекс для предотвращения дублирования запросов
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Виртуальное поле для пользователя-отправителя
friendshipSchema.virtual('requesterUser', {
  ref: 'User',
  localField: 'requester',
  foreignField: '_id',
  justOne: true
});

// Виртуальное поле для пользователя-получателя
friendshipSchema.virtual('recipientUser', {
  ref: 'User',
  localField: 'recipient',
  foreignField: '_id',
  justOne: true
});

// Статический метод для получения списка друзей пользователя
friendshipSchema.statics.getFriends = async function(userId, options = {}) {
  const { status = 'accepted', limit = 50, skip = 0 } = options;
  
  const friendships = await this.find({
    $or: [
      { requester: userId, status },
      { recipient: userId, status }
    ]
  })
    .populate('requesterUser', 'name email avatarUrl level experiencePoints')
    .populate('recipientUser', 'name email avatarUrl level experiencePoints')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);
  
  return friendships.map(friendship => {
    const friend = friendship.requester.toString() === userId.toString() 
      ? friendship.recipientUser 
      : friendship.requesterUser;
    
    return {
      friendshipId: friendship._id,
      userId: friend._id,
      name: friend.name,
      email: friend.email,
      avatarUrl: friend.avatarUrl,
      level: friend.level,
      experiencePoints: friend.experiencePoints,
      status: friendship.status,
      isRequester: friendship.requester.toString() === userId.toString(),
      createdAt: friendship.createdAt,
      updatedAt: friendship.updatedAt
    };
  });
};

// Статический метод для получения количества друзей
friendshipSchema.statics.getFriendCount = async function(userId) {
  const count = await this.countDocuments({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  });
  return count;
};

// Статический метод для проверки статуса дружбы
friendshipSchema.statics.getFriendshipStatus = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 }
    ]
  });
  
  if (!friendship) return null;
  
  return {
    status: friendship.status,
    isRequester: friendship.requester.toString() === userId1.toString(),
    friendshipId: friendship._id
  };
};

// Метод для отправки запроса в друзья
friendshipSchema.statics.sendFriendRequest = async function(requesterId, recipientId) {
  // Проверяем, не существует ли уже запрос
  const existing = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });
  
  if (existing) {
    throw new Error('Запрос на дружбу уже существует');
  }
  
  // Нельзя отправить запрос самому себе
  if (requesterId.toString() === recipientId.toString()) {
    throw new Error('Нельзя отправить запрос на дружбу самому себе');
  }
  
  const friendship = await this.create({
    requester: requesterId,
    recipient: recipientId,
    status: 'pending'
  });
  
  // Создаем уведомление для получателя
  const Notification = require('./Notification');
  const User = require('./User');
  
  const requester = await User.findById(requesterId);
  
  await Notification.create({
    userId: recipientId,
    type: 'friend_request',
    title: '📨 Новый запрос в друзья',
    message: `${requester.name} хочет добавить вас в друзья`,
    data: {
      requesterId,
      requesterName: requester.name,
      requesterAvatar: requester.avatarUrl,
      friendshipId: friendship._id
    }
  });
  
  return friendship;
};

// Метод для принятия запроса в друзья
friendshipSchema.statics.acceptFriendRequest = async function(friendshipId, userId) {
  const friendship = await this.findById(friendshipId);
  
  if (!friendship) {
    throw new Error('Запрос на дружбу не найден');
  }
  
  // Проверяем, является ли пользователь получателем
  if (friendship.recipient.toString() !== userId.toString()) {
    throw new Error('Вы не можете принять этот запрос');
  }
  
  if (friendship.status !== 'pending') {
    throw new Error('Запрос уже обработан');
  }
  
  friendship.status = 'accepted';
  friendship.updatedAt = new Date();
  await friendship.save();
  
  // Создаем уведомление для отправителя
  const Notification = require('./Notification');
  const User = require('./User');
  
  const recipient = await User.findById(userId);
  
  await Notification.create({
    userId: friendship.requester,
    type: 'friend_request_accepted',
    title: '✅ Запрос в друзья принят',
    message: `${recipient.name} принял(а) ваш запрос в друзья`,
    data: {
      recipientId: userId,
      recipientName: recipient.name,
      friendshipId: friendship._id
    }
  });
  
  // Проверяем достижение "Первый друг"
  await require('./Achievement').checkAchievement(friendship.requester, 'FIRST_FRIEND');
  await require('./Achievement').checkAchievement(userId, 'FIRST_FRIEND');
  
  return friendship;
};

// Метод для отклонения запроса в друзья
friendshipSchema.statics.rejectFriendRequest = async function(friendshipId, userId) {
  const friendship = await this.findById(friendshipId);
  
  if (!friendship) {
    throw new Error('Запрос на дружбу не найден');
  }
  
  if (friendship.recipient.toString() !== userId.toString()) {
    throw new Error('Вы не можете отклонить этот запрос');
  }
  
  if (friendship.status !== 'pending') {
    throw new Error('Запрос уже обработан');
  }
  
  friendship.status = 'rejected';
  friendship.updatedAt = new Date();
  await friendship.save();
  
  return friendship;
};

// Метод для удаления из друзей
friendshipSchema.statics.removeFriend = async function(friendshipId, userId) {
  const friendship = await this.findById(friendshipId);
  
  if (!friendship) {
    throw new Error('Запрос на дружбу не найден');
  }
  
  // Проверяем, является ли пользователь участником дружбы
  if (friendship.requester.toString() !== userId.toString() && 
      friendship.recipient.toString() !== userId.toString()) {
    throw new Error('Вы не можете удалить этого друга');
  }
  
  await friendship.deleteOne();
  
  return true;
};

// Предварительная валидация перед сохранением
friendshipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Friendship', friendshipSchema);