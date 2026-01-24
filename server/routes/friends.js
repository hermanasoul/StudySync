const express = require('express');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Получение списка друзей
router.get('/friends', auth, catchAsync(async (req, res) => {
  const { status = 'accepted', limit = 50, skip = 0 } = req.query;
  
  const friends = await Friendship.getFriends(req.user.id, {
    status,
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  res.json({
    success: true,
    data: friends,
    meta: {
      total: friends.length,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
}));

// Получение входящих запросов в друзья
router.get('/friends/requests/incoming', auth, catchAsync(async (req, res) => {
  const requests = await Friendship.find({
    recipient: req.user.id,
    status: 'pending'
  })
    .populate('requesterUser', 'name email avatarUrl level experiencePoints')
    .sort({ createdAt: -1 });
  
  const formattedRequests = requests.map(request => ({
    friendshipId: request._id,
    requester: {
      id: request.requesterUser._id,
      name: request.requesterUser.name,
      email: request.requesterUser.email,
      avatarUrl: request.requesterUser.avatarUrl,
      level: request.requesterUser.level,
      experiencePoints: request.requesterUser.experiencePoints
    },
    status: request.status,
    createdAt: request.createdAt
  }));
  
  res.json({
    success: true,
    data: formattedRequests,
    count: formattedRequests.length
  });
}));

// Получение исходящих запросов в друзья
router.get('/friends/requests/outgoing', auth, catchAsync(async (req, res) => {
  const requests = await Friendship.find({
    requester: req.user.id,
    status: 'pending'
  })
    .populate('recipientUser', 'name email avatarUrl level experiencePoints')
    .sort({ createdAt: -1 });
  
  const formattedRequests = requests.map(request => ({
    friendshipId: request._id,
    recipient: {
      id: request.recipientUser._id,
      name: request.recipientUser.name,
      email: request.recipientUser.email,
      avatarUrl: request.recipientUser.avatarUrl,
      level: request.recipientUser.level,
      experiencePoints: request.recipientUser.experiencePoints
    },
    status: request.status,
    createdAt: request.createdAt
  }));
  
  res.json({
    success: true,
    data: formattedRequests,
    count: formattedRequests.length
  });
}));

// Отправка запроса в друзья
router.post('/friends/request/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  // Проверяем существование пользователя
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Пользователь не найден', 404);
  }
  
  const friendship = await Friendship.sendFriendRequest(req.user.id, userId);
  
  res.status(201).json({
    success: true,
    message: 'Запрос на дружбу отправлен',
    data: {
      friendshipId: friendship._id,
      status: friendship.status
    }
  });
}));

// Принятие запроса в друзья
router.post('/friends/accept/:friendshipId', auth, catchAsync(async (req, res) => {
  const { friendshipId } = req.params;
  
  const friendship = await Friendship.acceptFriendRequest(friendshipId, req.user.id);
  
  res.json({
    success: true,
    message: 'Запрос на дружбу принят',
    data: {
      friendshipId: friendship._id,
      status: friendship.status
    }
  });
}));

// Отклонение запроса в друзья
router.post('/friends/reject/:friendshipId', auth, catchAsync(async (req, res) => {
  const { friendshipId } = req.params;
  
  const friendship = await Friendship.rejectFriendRequest(friendshipId, req.user.id);
  
  res.json({
    success: true,
    message: 'Запрос на дружбу отклонен',
    data: {
      friendshipId: friendship._id,
      status: friendship.status
    }
  });
}));

// Удаление из друзей
router.delete('/friends/:friendshipId', auth, catchAsync(async (req, res) => {
  const { friendshipId } = req.params;
  
  await Friendship.removeFriend(friendshipId, req.user.id);
  
  res.json({
    success: true,
    message: 'Друг удален'
  });
}));

// Получение статуса дружбы с пользователем
router.get('/friends/status/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  const status = await Friendship.getFriendshipStatus(req.user.id, userId);
  
  res.json({
    success: true,
    data: status
  });
}));

// Поиск пользователей для добавления в друзья
router.get('/friends/search', auth, catchAsync(async (req, res) => {
  const { query, excludeFriends = true, limit = 20 } = req.query;
  
  if (!query || query.length < 2) {
    throw new AppError('Поисковый запрос должен содержать минимум 2 символа', 400);
  }
  
  let excludeIds = [req.user.id];
  
  if (excludeFriends === 'true') {
    // Получаем ID всех друзей и запросов
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user.id },
        { recipient: req.user.id }
      ]
    });
    
    friendships.forEach(friendship => {
      if (friendship.requester.toString() !== req.user.id.toString()) {
        excludeIds.push(friendship.requester);
      }
      if (friendship.recipient.toString() !== req.user.id.toString()) {
        excludeIds.push(friendship.recipient);
      }
    });
  }
  
  const users = await User.find({
    _id: { $nin: excludeIds },
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
    ],
    isActive: true
  })
    .select('name email avatarUrl level experiencePoints socialStats')
    .limit(parseInt(limit));
  
  // Для каждого пользователя проверяем статус дружбы
  const usersWithStatus = await Promise.all(users.map(async (user) => {
    const friendshipStatus = await Friendship.getFriendshipStatus(req.user.id, user._id);
    
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      level: user.level,
      experiencePoints: user.experiencePoints,
      followerCount: user.socialStats?.followerCount || 0,
      friendshipStatus: friendshipStatus ? friendshipStatus.status : null,
      isRequester: friendshipStatus ? friendshipStatus.isRequester : null
    };
  }));
  
  res.json({
    success: true,
    data: usersWithStatus,
    count: usersWithStatus.length
  });
}));

// Получение статистики друзей
router.get('/friends/stats', auth, catchAsync(async (req, res) => {
  const friendCount = await Friendship.getFriendCount(req.user.id);
  
  // Получаем топ друзей по опыту
  const friends = await Friendship.getFriends(req.user.id, { status: 'accepted' });
  
  const sortedByExperience = [...friends]
    .sort((a, b) => b.experiencePoints - a.experiencePoints)
    .slice(0, 5);
  
  const sortedByLevel = [...friends]
    .sort((a, b) => b.level - a.level || b.experiencePoints - a.experiencePoints)
    .slice(0, 5);
  
  res.json({
    success: true,
    data: {
      totalFriends: friendCount,
      topByExperience: sortedByExperience,
      topByLevel: sortedByLevel,
      averageLevel: friends.length > 0 
        ? Math.round(friends.reduce((sum, f) => sum + f.level, 0) / friends.length)
        : 0,
      averageExperience: friends.length > 0
        ? Math.round(friends.reduce((sum, f) => sum + f.experiencePoints, 0) / friends.length)
        : 0
    }
  });
}));

module.exports = router;