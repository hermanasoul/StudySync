// server/routes/follows.js

const express = require('express');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Follows
 *   description: Подписки на пользователей (followers / following)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FollowUser:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         avatarUrl:
 *           type: string
 *         level:
 *           type: number
 *         experiencePoints:
 *           type: number
 *         isFollowing:
 *           type: boolean
 *         friendshipStatus:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /follows/follow/{userId}:
 *   post:
 *     summary: Подписаться на пользователя
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       201:
 *         description: Подписка оформлена
 */
router.post('/follow/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new AppError('Пользователь не найден', 404);

  const follow = await Follow.followUser(req.user.id, userId);
  await User.findByIdAndUpdate(userId, { $inc: { 'socialStats.followerCount': 1 } });
  await User.findByIdAndUpdate(req.user.id, { $inc: { 'socialStats.followingCount': 1 } });

  res.status(201).json({
    success: true,
    message: 'Вы подписались на пользователя',
    data: { followId: follow._id, userId: user._id, name: user.name }
  });
}));

/**
 * @swagger
 * /follows/follow/{userId}:
 *   delete:
 *     summary: Отписаться от пользователя
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Подписка отменена
 */
router.delete('/follow/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  await Follow.unfollowUser(req.user.id, userId);
  await User.findByIdAndUpdate(userId, { $inc: { 'socialStats.followerCount': -1 } });
  await User.findByIdAndUpdate(req.user.id, { $inc: { 'socialStats.followingCount': -1 } });
  res.json({ success: true, message: 'Вы отписались от пользователя' });
}));

/**
 * @swagger
 * /follows/followers:
 *   get:
 *     summary: Получить список подписчиков текущего пользователя
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Список подписчиков
 */
router.get('/followers', auth, catchAsync(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;
  const followers = await Follow.getFollowers(req.user.id, { limit: parseInt(limit), skip: parseInt(skip) });
  res.json({ success: true, data: followers, meta: { total: followers.length, limit: parseInt(limit), skip: parseInt(skip) } });
}));

/**
 * @swagger
 * /follows/following:
 *   get:
 *     summary: Получить список подписок текущего пользователя
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Список подписок
 */
router.get('/following', auth, catchAsync(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;
  const following = await Follow.getFollowing(req.user.id, { limit: parseInt(limit), skip: parseInt(skip) });
  res.json({ success: true, data: following, meta: { total: following.length, limit: parseInt(limit), skip: parseInt(skip) } });
}));

/**
 * @swagger
 * /follows/{userId}/followers:
 *   get:
 *     summary: Получить подписчиков другого пользователя
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Список подписчиков
 */
router.get('/:userId/followers', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  const user = await User.findById(userId);
  if (!user) throw new AppError('Пользователь не найден', 404);

  const followers = await Follow.getFollowers(userId, { limit: parseInt(limit), skip: parseInt(skip) });
  const followersWithStatus = await Promise.all(followers.map(async (f) => {
    const isFollowing = await Follow.isFollowing(req.user.id, f.userId);
    const friendshipStatus = await require('../models/Friendship').getFriendshipStatus(req.user.id, f.userId);
    return { ...f, isFollowing, friendshipStatus: friendshipStatus ? friendshipStatus.status : null };
  }));

  res.json({ success: true, data: followersWithStatus, meta: { total: followersWithStatus.length, limit: parseInt(limit), skip: parseInt(skip) } });
}));

/**
 * @swagger
 * /follows/{userId}/following:
 *   get:
 *     summary: Получить подписки другого пользователя
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Список подписок
 */
router.get('/:userId/following', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  const user = await User.findById(userId);
  if (!user) throw new AppError('Пользователь не найден', 404);

  const following = await Follow.getFollowing(userId, { limit: parseInt(limit), skip: parseInt(skip) });
  const followingWithStatus = await Promise.all(following.map(async (f) => {
    const isFollowing = await Follow.isFollowing(req.user.id, f.userId);
    const friendshipStatus = await require('../models/Friendship').getFriendshipStatus(req.user.id, f.userId);
    return { ...f, isFollowing, friendshipStatus: friendshipStatus ? friendshipStatus.status : null };
  }));

  res.json({ success: true, data: followingWithStatus, meta: { total: followingWithStatus.length, limit: parseInt(limit), skip: parseInt(skip) } });
}));

/**
 * @swagger
 * /follows/check/{userId}:
 *   get:
 *     summary: Проверить, подписан ли текущий пользователь на другого
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Статус подписки
 */
router.get('/check/:userId', auth, catchAsync(async (req, res) => {
  const isFollowing = await Follow.isFollowing(req.user.id, req.params.userId);
  res.json({ success: true, data: { isFollowing } });
}));

/**
 * @swagger
 * /follows/recommendations:
 *   get:
 *     summary: Получить рекомендации по подпискам
 *     tags: [Follows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Рекомендованные пользователи
 */
router.get('/recommendations', auth, catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  const following = await Follow.find({ follower: req.user.id }).select('following');
  const followingIds = following.map(f => f.following);
  followingIds.push(req.user.id);

  const recommendedUsers = await User.aggregate([
    { $match: { _id: { $nin: followingIds }, isActive: true } },
    { $sort: { 'socialStats.followerCount': -1 } },
    { $limit: parseInt(limit) },
    { $project: { _id: 1, name: 1, email: 1, avatarUrl: 1, level: 1, experiencePoints: 1, followerCount: '$socialStats.followerCount', followingCount: '$socialStats.followingCount' } }
  ]);

  const usersWithStatus = await Promise.all(recommendedUsers.map(async (u) => {
    const friendshipStatus = await require('../models/Friendship').getFriendshipStatus(req.user.id, u._id);
    return { ...u, friendshipStatus: friendshipStatus ? friendshipStatus.status : null };
  }));

  res.json({ success: true, data: usersWithStatus });
}));

module.exports = router;