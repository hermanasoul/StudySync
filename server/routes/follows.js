const express = require('express');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

// Подписаться на пользователя
router.post('/follow/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  // Проверяем существование пользователя
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Пользователь не найден', 404);
  }
  
  const follow = await Follow.followUser(req.user.id, userId);
  
  // Обновляем статистику
  await User.findByIdAndUpdate(userId, {
    $inc: { 'socialStats.followerCount': 1 }
  });
  
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { 'socialStats.followingCount': 1 }
  });
  
  res.status(201).json({
    success: true,
    message: 'Вы подписались на пользователя',
    data: {
      followId: follow._id,
      userId: user._id,
      name: user.name
    }
  });
}));

// Отписаться от пользователя
router.delete('/follow/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  await Follow.unfollowUser(req.user.id, userId);
  
  // Обновляем статистику
  await User.findByIdAndUpdate(userId, {
    $inc: { 'socialStats.followerCount': -1 }
  });
  
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { 'socialStats.followingCount': -1 }
  });
  
  res.json({
    success: true,
    message: 'Вы отписались от пользователя'
  });
}));

// Получение подписчиков пользователя
router.get('/followers', auth, catchAsync(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;
  
  const followers = await Follow.getFollowers(req.user.id, {
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  res.json({
    success: true,
    data: followers,
    meta: {
      total: followers.length,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
}));

// Получение подписок пользователя
router.get('/following', auth, catchAsync(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;
  
  const following = await Follow.getFollowing(req.user.id, {
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  res.json({
    success: true,
    data: following,
    meta: {
      total: following.length,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
}));

// Получение подписчиков другого пользователя
router.get('/:userId/followers', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  
  // Проверяем существование пользователя
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Пользователь не найден', 404);
  }
  
  const followers = await Follow.getFollowers(userId, {
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  // Проверяем, подписан ли текущий пользователь на каждого подписчика
  const followersWithFollowStatus = await Promise.all(followers.map(async (follower) => {
    const isFollowing = await Follow.isFollowing(req.user.id, follower.userId);
    const friendshipStatus = await require('../models/Friendship').getFriendshipStatus(req.user.id, follower.userId);
    
    return {
      ...follower,
      isFollowing,
      friendshipStatus: friendshipStatus ? friendshipStatus.status : null
    };
  }));
  
  res.json({
    success: true,
    data: followersWithFollowStatus,
    meta: {
      total: followersWithFollowStatus.length,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
}));

// Получение подписок другого пользователя
router.get('/:userId/following', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  
  // Проверяем существование пользователя
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Пользователь не найден', 404);
  }
  
  const following = await Follow.getFollowing(userId, {
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  // Проверяем, подписан ли текущий пользователь на каждого подписчика
  const followingWithFollowStatus = await Promise.all(following.map(async (follow) => {
    const isFollowing = await Follow.isFollowing(req.user.id, follow.userId);
    const friendshipStatus = await require('../models/Friendship').getFriendshipStatus(req.user.id, follow.userId);
    
    return {
      ...follow,
      isFollowing,
      friendshipStatus: friendshipStatus ? friendshipStatus.status : null
    };
  }));
  
  res.json({
    success: true,
    data: followingWithFollowStatus,
    meta: {
      total: followingWithFollowStatus.length,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
}));

// Проверка, подписан ли текущий пользователь на другого пользователя
router.get('/check/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  
  const isFollowing = await Follow.isFollowing(req.user.id, userId);
  
  res.json({
    success: true,
    data: { isFollowing }
  });
}));

// Получение рекомендаций по подпискам (пользователи, на которых можно подписаться)
router.get('/recommendations', auth, catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  
  // Получаем пользователей, на которых уже подписаны
  const following = await Follow.find({ follower: req.user.id })
    .select('following');
  
  const followingIds = following.map(f => f.following);
  followingIds.push(req.user.id); // Исключаем себя
  
  // Получаем пользователей с наибольшим количеством подписчиков
  const recommendedUsers = await User.aggregate([
    { $match: { 
        _id: { $nin: followingIds },
        isActive: true 
      } 
    },
    { $sort: { 'socialStats.followerCount': -1 } },
    { $limit: parseInt(limit) },
    { $project: {
        _id: 1,
        name: 1,
        email: 1,
        avatarUrl: 1,
        level: 1,
        experiencePoints: 1,
        followerCount: '$socialStats.followerCount',
        followingCount: '$socialStats.followingCount'
      }
    }
  ]);
  
  // Проверяем статус дружбы для каждого пользователя
  const usersWithStatus = await Promise.all(recommendedUsers.map(async (user) => {
    const friendshipStatus = await require('../models/Friendship').getFriendshipStatus(req.user.id, user._id);
    
    return {
      ...user,
      friendshipStatus: friendshipStatus ? friendshipStatus.status : null
    };
  }));
  
  res.json({
    success: true,
    data: usersWithStatus
  });
}));

module.exports = router;