// server/routes/friends.js

const { body, param, query } = require('express-validator');
const express = require('express');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Управление друзьями и запросами в друзья
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Friend:
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
 *         friendshipId:
 *           type: string
 *         friendshipSince:
 *           type: string
 *           format: date-time
 *     FriendRequest:
 *       type: object
 *       properties:
 *         friendshipId:
 *           type: string
 *         requester:
 *           $ref: '#/components/schemas/User'
 *         recipient:
 *           $ref: '#/components/schemas/User'
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /friends:
 *   get:
 *     summary: Получить список друзей
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *           default: accepted
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
 *         description: Список друзей
 */
router.get('/', auth, catchAsync(async (req, res) => {
  const { status = 'accepted', limit = 50, skip = 0 } = req.query;
  
  const friends = await Friendship.getFriends(req.user.id, {
    status,
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  res.json({
    success: true,
    data: friends,
    meta: { total: friends.length, limit: parseInt(limit), skip: parseInt(skip) }
  });
}));

/**
 * @swagger
 * /friends/requests/incoming:
 *   get:
 *     summary: Получить входящие запросы в друзья
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список входящих запросов
 */
router.get('/requests/incoming', auth, catchAsync(async (req, res) => {
  const requests = await Friendship.find({ recipient: req.user.id, status: 'pending' })
    .populate('requesterUser', 'name email avatarUrl level experiencePoints')
    .sort({ createdAt: -1 });
  
  const formatted = requests.map(r => ({
    friendshipId: r._id,
    requester: {
      id: r.requesterUser._id,
      name: r.requesterUser.name,
      email: r.requesterUser.email,
      avatarUrl: r.requesterUser.avatarUrl,
      level: r.requesterUser.level,
      experiencePoints: r.requesterUser.experiencePoints
    },
    status: r.status,
    createdAt: r.createdAt
  }));
  
  res.json({ success: true, data: formatted, count: formatted.length });
}));

/**
 * @swagger
 * /friends/requests/outgoing:
 *   get:
 *     summary: Получить исходящие запросы в друзья
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список исходящих запросов
 */
router.get('/requests/outgoing', auth, catchAsync(async (req, res) => {
  const requests = await Friendship.find({ requester: req.user.id, status: 'pending' })
    .populate('recipientUser', 'name email avatarUrl level experiencePoints')
    .sort({ createdAt: -1 });
  
  const formatted = requests.map(r => ({
    friendshipId: r._id,
    recipient: {
      id: r.recipientUser._id,
      name: r.recipientUser.name,
      email: r.recipientUser.email,
      avatarUrl: r.recipientUser.avatarUrl,
      level: r.recipientUser.level,
      experiencePoints: r.recipientUser.experiencePoints
    },
    status: r.status,
    createdAt: r.createdAt
  }));
  
  res.json({ success: true, data: formatted, count: formatted.length });
}));

/**
 * @swagger
 * /friends/request/{userId}:
 *   post:
 *     summary: Отправить запрос в друзья
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя, которому отправляется запрос
 *     responses:
 *       201:
 *         description: Запрос отправлен
 */
router.post('/request/:userId', auth, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new AppError('Пользователь не найден', 404);
  
  const friendship = await Friendship.sendFriendRequest(req.user.id, userId);
  res.status(201).json({
    success: true,
    message: 'Запрос на дружбу отправлен',
    data: { friendshipId: friendship._id, status: friendship.status }
  });
}));

/**
 * @swagger
 * /friends/accept/{friendshipId}:
 *   post:
 *     summary: Принять запрос в друзья
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendshipId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID запроса дружбы
 *     responses:
 *       200:
 *         description: Запрос принят
 */
router.post('/accept/:friendshipId', auth, catchAsync(async (req, res) => {
  const friendship = await Friendship.acceptFriendRequest(req.params.friendshipId, req.user.id);
  res.json({
    success: true,
    message: 'Запрос на дружбу принят',
    data: { friendshipId: friendship._id, status: friendship.status }
  });
}));

/**
 * @swagger
 * /friends/reject/{friendshipId}:
 *   post:
 *     summary: Отклонить запрос в друзья
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendshipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Запрос отклонён
 */
router.post('/reject/:friendshipId', auth, catchAsync(async (req, res) => {
  const friendship = await Friendship.rejectFriendRequest(req.params.friendshipId, req.user.id);
  res.json({
    success: true,
    message: 'Запрос на дружбу отклонен',
    data: { friendshipId: friendship._id, status: friendship.status }
  });
}));

/**
 * @swagger
 * /friends/{friendshipId}:
 *   delete:
 *     summary: Удалить из друзей
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendshipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Друг удалён
 */
router.delete('/:friendshipId', auth, catchAsync(async (req, res) => {
  await Friendship.removeFriend(req.params.friendshipId, req.user.id);
  res.json({ success: true, message: 'Друг удален' });
}));

/**
 * @swagger
 * /friends/status/{userId}:
 *   get:
 *     summary: Получить статус дружбы с пользователем
 *     tags: [Friends]
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
 *         description: Статус дружбы
 */
router.get('/status/:userId', auth, catchAsync(async (req, res) => {
  const status = await Friendship.getFriendshipStatus(req.user.id, req.params.userId);
  res.json({ success: true, data: status });
}));

/**
 * @swagger
 * /friends/search:
 *   get:
 *     summary: Поиск пользователей для добавления в друзья
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: excludeFriends
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Результаты поиска
 */
router.get('/search', auth, catchAsync(async (req, res) => {
  const { query: q, excludeFriends = true, limit = 20 } = req.query;
  if (!q || q.length < 2) throw new AppError('Поисковый запрос должен содержать минимум 2 символа', 400);
  
  let excludeIds = [req.user.id];
  if (excludeFriends === 'true') {
    const friendships = await Friendship.find({ $or: [{ requester: req.user.id }, { recipient: req.user.id }] });
    friendships.forEach(f => {
      if (f.requester.toString() !== req.user.id.toString()) excludeIds.push(f.requester);
      if (f.recipient.toString() !== req.user.id.toString()) excludeIds.push(f.recipient);
    });
  }
  
  const users = await User.find({
    _id: { $nin: excludeIds },
    $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }],
    isActive: true
  }).select('name email avatarUrl level experiencePoints socialStats').limit(parseInt(limit));
  
  const usersWithStatus = await Promise.all(users.map(async u => {
    const status = await Friendship.getFriendshipStatus(req.user.id, u._id);
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      level: u.level,
      experiencePoints: u.experiencePoints,
      followerCount: u.socialStats?.followerCount || 0,
      friendshipStatus: status ? status.status : null,
      isRequester: status ? status.isRequester : null
    };
  }));
  
  res.json({ success: true, data: usersWithStatus, count: usersWithStatus.length });
}));

/**
 * @swagger
 * /friends/stats:
 *   get:
 *     summary: Получить статистику друзей
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика друзей
 */
router.get('/stats', auth, catchAsync(async (req, res) => {
  const friendCount = await Friendship.getFriendCount(req.user.id);
  const friends = await Friendship.getFriends(req.user.id, { status: 'accepted' });
  const sortedByExp = [...friends].sort((a,b) => b.experiencePoints - a.experiencePoints).slice(0,5);
  const sortedByLvl = [...friends].sort((a,b) => b.level - a.level || b.experiencePoints - a.experiencePoints).slice(0,5);
  
  res.json({
    success: true,
    data: {
      totalFriends: friendCount,
      topByExperience: sortedByExp,
      topByLevel: sortedByLvl,
      averageLevel: friends.length ? Math.round(friends.reduce((s,f) => s+f.level,0)/friends.length) : 0,
      averageExperience: friends.length ? Math.round(friends.reduce((s,f) => s+f.experiencePoints,0)/friends.length) : 0
    }
  });
}));

module.exports = router;