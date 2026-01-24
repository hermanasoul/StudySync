const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID подписчика обязательно'],
    index: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID того, на кого подписываются обязательно'],
    index: true
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Составной уникальный индекс для предотвращения дублирования подписок
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Виртуальное поле для пользователя-подписчика
followSchema.virtual('followerUser', {
  ref: 'User',
  localField: 'follower',
  foreignField: '_id',
  justOne: true
});

// Виртуальное поле для пользователя, на которого подписались
followSchema.virtual('followingUser', {
  ref: 'User',
  localField: 'following',
  foreignField: '_id',
  justOne: true
});

// Статический метод для подписки на пользователя
followSchema.statics.followUser = async function(followerId, followingId) {
  // Проверяем, не подписан ли уже
  const existing = await this.findOne({
    follower: followerId,
    following: followingId
  });
  
  if (existing) {
    throw new Error('Вы уже подписаны на этого пользователя');
  }
  
  // Нельзя подписаться на себя
  if (followerId.toString() === followingId.toString()) {
    throw new Error('Нельзя подписаться на себя');
  }
  
  const follow = await this.create({
    follower: followerId,
    following: followingId
  });
  
  // Создаем уведомление для того, на кого подписались
  const Notification = require('./Notification');
  const User = require('./User');
  
  const follower = await User.findById(followerId);
  
  await Notification.create({
    userId: followingId,
    type: 'new_follower',
    title: '👥 Новый подписчик',
    message: `${follower.name} подписался(ась) на вас`,
    data: {
      followerId,
      followerName: follower.name,
      followerAvatar: follower.avatarUrl,
      followId: follow._id
    }
  });
  
  return follow;
};

// Статический метод для отписки
followSchema.statics.unfollowUser = async function(followerId, followingId) {
  const result = await this.deleteOne({
    follower: followerId,
    following: followingId
  });
  
  if (result.deletedCount === 0) {
    throw new Error('Подписка не найдена');
  }
  
  return true;
};

// Статический метод для получения подписчиков пользователя
followSchema.statics.getFollowers = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  const follows = await this.find({ following: userId })
    .populate('followerUser', 'name email avatarUrl level experiencePoints')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  return follows.map(follow => ({
    followId: follow._id,
    userId: follow.followerUser._id,
    name: follow.followerUser.name,
    email: follow.followerUser.email,
    avatarUrl: follow.followerUser.avatarUrl,
    level: follow.followerUser.level,
    experiencePoints: follow.followerUser.experiencePoints,
    notificationsEnabled: follow.notificationsEnabled,
    followedAt: follow.createdAt
  }));
};

// Статический метод для получения подписок пользователя
followSchema.statics.getFollowing = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  const follows = await this.find({ follower: userId })
    .populate('followingUser', 'name email avatarUrl level experiencePoints')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  return follows.map(follow => ({
    followId: follow._id,
    userId: follow.followingUser._id,
    name: follow.followingUser.name,
    email: follow.followingUser.email,
    avatarUrl: follow.followingUser.avatarUrl,
    level: follow.followingUser.level,
    experiencePoints: follow.followingUser.experiencePoints,
    notificationsEnabled: follow.notificationsEnabled,
    followedAt: follow.createdAt
  }));
};

// Статический метод для получения количества подписчиков
followSchema.statics.getFollowerCount = async function(userId) {
  return await this.countDocuments({ following: userId });
};

// Статический метод для получения количества подписок
followSchema.statics.getFollowingCount = async function(userId) {
  return await this.countDocuments({ follower: userId });
};

// Статический метод для проверки, подписан ли пользователь
followSchema.statics.isFollowing = async function(followerId, followingId) {
  const follow = await this.findOne({
    follower: followerId,
    following: followingId
  });
  
  return !!follow;
};

module.exports = mongoose.model('Follow', followSchema);