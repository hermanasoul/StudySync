// server/routes/friends.js

const express = require('express');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { catchAsync, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Получить список друзей (гарантированно без дубликатов)
router.get('/', auth, catchAsync(async (req, res) => {
  // Приводим ID пользователя к строке – это ОБЯЗАТЕЛЬНО
  const userId = req.user.id.toString();

  const friendships = await Friendship.find({
    status: 'accepted',
    $or: [
      { requester: userId },
      { recipient: userId }
    ]
  }).populate('requester recipient', 'name email avatarUrl level');

  const seen = new Set();
  const friends = [];

  for (const f of friendships) {
    const isRequester = f.requester._id.toString() === userId;
    const friend = isRequester ? f.recipient : f.requester;
    const friendId = friend._id.toString();

    // Пропускаем себя и дубликаты
    if (friendId === userId || seen.has(friendId)) continue;
    seen.add(friendId);

    friends.push({
      _id: friend._id,
      name: friend.name,
      email: friend.email,
      avatarUrl: friend.avatarUrl,
      level: friend.level,
      friendshipId: f._id
    });
  }

  res.json({ success: true, friends });
}));

// Входящие заявки (без себя)
router.get('/requests/incoming', auth, catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const requests = await Friendship.find({
    recipient: userId,
    status: 'pending',
    $expr: { $ne: ["$requester", "$recipient"] }   // исключаем ошибочные связи "сам с собой"
  }).populate('requester', 'name email avatarUrl level');
  res.json({ success: true, requests });
}));

// Исходящие заявки (без себя)
router.get('/requests/outgoing', auth, catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const requests = await Friendship.find({
    requester: userId,
    status: 'pending',
    $expr: { $ne: ["$requester", "$recipient"] }
  }).populate('recipient', 'name email avatarUrl level');
  res.json({ success: true, requests });
}));

// Отправить запрос
router.post('/request/:userId', auth, catchAsync(async (req, res) => {
  if (req.user.id.toString() === req.params.userId) {
    throw new AppError('Нельзя отправить запрос самому себе', 400);
  }
  const friendship = await Friendship.sendFriendRequest(req.user.id.toString(), req.params.userId);
  res.status(201).json({ success: true, friendship });
}));

// Принять запрос
router.post('/accept/:friendshipId', auth, catchAsync(async (req, res) => {
  const friendship = await Friendship.acceptFriendRequest(req.params.friendshipId, req.user.id.toString());
  res.json({ success: true, friendship });
}));

// Отклонить запрос
router.post('/reject/:friendshipId', auth, catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const friendship = await Friendship.findOneAndUpdate(
    { _id: req.params.friendshipId, recipient: userId, status: 'pending' },
    { status: 'rejected' }
  );
  if (!friendship) throw new AppError('Заявка не найдена', 404);
  res.json({ success: true, message: 'Заявка отклонена' });
}));

// Удалить друга
router.delete('/:friendshipId', auth, catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const friendship = await Friendship.findOneAndDelete({
    _id: req.params.friendshipId,
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }]
  });
  if (!friendship) throw new AppError('Дружба не найдена', 404);

  await User.findByIdAndUpdate(friendship.requester, {
    $pull: { friends: { friendshipId: friendship._id } }
  });
  await User.findByIdAndUpdate(friendship.recipient, {
    $pull: { friends: { friendshipId: friendship._id } }
  });

  res.json({ success: true, message: 'Друг удалён' });
}));

// Поиск пользователей
router.get('/search', auth, catchAsync(async (req, res) => {
  const { query: searchQuery, limit = 10 } = req.query;
  if (!searchQuery) throw new AppError('Введите запрос', 400);
  const users = await User.find({
    _id: { $ne: req.user.id },
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { email: { $regex: searchQuery, $options: 'i' } }
    ]
  })
    .select('name email avatarUrl level')
    .limit(parseInt(limit));

  res.json({ success: true, users });
}));

// Статус дружбы
router.get('/status/:userId', auth, catchAsync(async (req, res) => {
  const userId = req.user.id.toString();
  const friendship = await Friendship.findOne({
    $or: [
      { requester: userId, recipient: req.params.userId },
      { requester: req.params.userId, recipient: userId }
    ]
  });
  res.json({
    success: true,
    friendshipStatus: friendship ? friendship.status : 'none',
    friendshipId: friendship ? friendship._id : null
  });
}));

module.exports = router;