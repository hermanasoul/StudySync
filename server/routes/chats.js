const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { clearCacheOnMutation } = require('../middleware/cache');
const upload = require('../middleware/upload');
const router = express.Router();

const schedulePendingMessages = async (ws) => {
  try {
    const pending = await Message.find({
      scheduledAt: { $gt: new Date() },
      deleted: false,
    });

    pending.forEach(msg => {
      const delay = new Date(msg.scheduledAt).getTime() - Date.now();
      setTimeout(() => sendScheduledMessage(msg._id, ws), delay);
    });
    console.log(`📅 Планировщик: ${pending.length} отложенных сообщений запланировано`);
  } catch (err) {
    console.error('Ошибка планировщика отложенных сообщений:', err);
  }
};

const sendScheduledMessage = async (messageId, ws) => {
  try {
    // Атомарно обновляем документ: createdAt = сейчас, scheduledAt = null
    const msg = await Message.findByIdAndUpdate(
      messageId,
      { createdAt: new Date(), scheduledAt: null },
      { new: true }
    ).populate('sender', 'name avatarUrl');

    if (!msg || msg.deleted) return;

    const chat = await Chat.findById(msg.chat);
    if (!chat) return;

    // Обновляем lastMessage чата
    chat.lastMessage = msg._id;
    await chat.save();

    if (ws) {
      ws.emitToChat(msg.chat.toString(), 'new_message', msg);

      // Мгновенное обновление превью
      const updatedChat = await Chat.findById(chat._id)
        .populate('participants', 'name email avatarUrl')
        .populate('lastMessage');
      ws.emitToChat(msg.chat.toString(), 'chat_updated', updatedChat);

      // Обновим список отложенных сообщений у отправителя
      ws.emitToUser(msg.sender._id.toString(), 'scheduled_updated');
    }

    console.log(`📤 Отложенное сообщение отправлено: ${msg._id}`);
  } catch (err) {
    console.error('Ошибка отправки отложенного сообщения:', err);
  }
};

// Вспомогательная: обновить lastMessage чата после удаления
const updateLastMessageAndNotify = async (chatId, ws) => {
  const lastMsg = await Message.findOne({
    chat: chatId,
    deleted: false,
    scheduledAt: null,
  }).sort({ createdAt: -1 });

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { lastMessage: lastMsg?._id || null },
    { new: true }
  );

  if (ws && chat) {
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email avatarUrl')
      .populate('lastMessage');
    ws.emitToChat(chat._id.toString(), 'chat_updated', populatedChat);
  }
};

// ---------- Маршруты ----------

// GET /api/chats — список чатов пользователя
router.get('/', auth, catchAsync(async (req, res) => {
  const chats = await Chat.find({ participants: req.user.id })
    .populate('participants', 'name email avatarUrl')
    .populate({
      path: 'lastMessage',
      match: { deleted: false },
      options: { limit: 1 }
    })
    .sort({ updatedAt: -1 });

  const result = chats.map(chat => ({
    _id: chat._id,
    type: chat.type,
    name: chat.type === 'group' ? chat.name : null,
    participants: chat.participants,
    lastMessage: chat.lastMessage || null,
    unreadCount: 0,
    updatedAt: chat.updatedAt
  }));

  res.json({ success: true, data: result });
}));

// POST /api/chats — создать чат
router.post('/', auth, clearCacheOnMutation(), catchAsync(async (req, res) => {
  const { type, participantIds, name } = req.body;

  if (type === 'direct') {
    if (!participantIds || participantIds.length !== 1) {
      throw new AppError('Для личного чата нужен один участник', 400);
    }
    const existing = await Chat.findOne({
      type: 'direct',
      participants: { $all: [req.user.id, participantIds[0]] }
    });
    if (existing) {
      await existing.populate('participants', 'name email avatarUrl');
      return res.json({
        success: true,
        chat: {
          _id: existing._id,
          type: existing.type,
          name: null,
          participants: existing.participants,
          lastMessage: existing.lastMessage || null,
          unreadCount: 0,
          updatedAt: existing.updatedAt
        }
      });
    }
  }

  if (type === 'group' && !name) {
    throw new AppError('Укажите название группы', 400);
  }

  const allParticipants = Array.from(new Set([req.user.id, ...(participantIds || [])]));
  const chat = await Chat.create({
    type,
    name: type === 'group' ? name : undefined,
    participants: allParticipants,
    createdBy: req.user.id
  });

  await chat.populate('participants', 'name email avatarUrl');
  res.status(201).json({
    success: true,
    chat: {
      _id: chat._id,
      type: chat.type,
      name: chat.type === 'group' ? chat.name : null,
      participants: chat.participants,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: chat.updatedAt
    }
  });
}));

// GET /api/chats/:chatId/messages — сообщения
router.get('/:chatId/messages', auth, catchAsync(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat || !chat.participants.includes(req.user.id)) {
    throw new AppError('Чат не найден или доступ запрещён', 404);
  }

  const messages = await Message.find({
    chat: chat._id,
    deleted: false,
    deletedFor: { $ne: req.user.id }
  })
    .populate('sender', 'name avatarUrl')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, data: messages.reverse() });
}));

// POST /api/chats/:chatId/messages — отправить сообщение (текст/файл/отложенное)
router.post('/:chatId/messages', auth, upload.array('attachments', 5), clearCacheOnMutation(), catchAsync(async (req, res) => {
  const { content, scheduledAt } = req.body;
  const chat = await Chat.findById(req.params.chatId);
  if (!chat || !chat.participants.includes(req.user.id)) {
    throw new AppError('Чат не найден или доступ запрещён', 404);
  }

  const attachments = req.files ? req.files.map(f => ({
    url: '/uploads/' + f.filename,
    filename: f.originalname,
    fileType: f.mimetype,
    size: f.size
  })) : [];

  const messageData = {
    chat: chat._id,
    sender: req.user.id,
    content: content?.trim() || '',
    attachments
  };

  if (scheduledAt) {
    messageData.scheduledAt = new Date(scheduledAt);
    if (isNaN(messageData.scheduledAt.getTime())) throw new AppError('Неверная дата отложенной отправки', 400);
  }

  const message = await Message.create(messageData);
  await message.populate('sender', 'name avatarUrl');

  const ws = req.app.get('ws');

  if (!scheduledAt) {
    chat.lastMessage = message._id;
    await chat.save();
    if (ws) ws.emitToChat(chat._id.toString(), 'new_message', message);
  } else {
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay <= 0) {
      chat.lastMessage = message._id;
      await chat.save();
      if (ws) ws.emitToChat(chat._id.toString(), 'new_message', message);
    } else {
      setTimeout(() => sendScheduledMessage(message._id, ws), delay);
    }
  }

  res.status(201).json({ success: true, message });
}));

// PUT /api/chats/messages/:messageId — редактировать сообщение
router.put('/messages/:messageId', auth, clearCacheOnMutation(), catchAsync(async (req, res) => {
  const { content } = req.body;
  const message = await Message.findOne({ _id: req.params.messageId, sender: req.user.id, deleted: false });
  if (!message) throw new AppError('Сообщение не найдено или нет прав', 404);

  message.content = content.trim();
  message.isEdited = true;
  await message.save();

  const ws = req.app.get('ws');
  if (ws) {
    ws.emitToChat(message.chat.toString(), 'message_updated', message);
  }

  res.json({ success: true, message });
}));

// DELETE /api/chats/messages/:messageId — удаление у всех (только отправитель)
router.delete('/messages/:messageId', auth, clearCacheOnMutation(), catchAsync(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, sender: req.user.id, deleted: false });
  if (!message) throw new AppError('Сообщение не найдено или нет прав', 404);

  const chatId = message.chat;
  message.deleted = true;
  await message.save();

  await updateLastMessageAndNotify(chatId, req.app.get('ws'));

  const ws = req.app.get('ws');
  if (ws) {
    ws.emitToChat(chatId.toString(), 'message_deleted', { messageId: message._id });
  }

  res.json({ success: true, message: 'Сообщение удалено для всех' });
}));

// DELETE /api/chats/messages/:messageId/for-me — удаление только у текущего пользователя
router.delete('/messages/:messageId/for-me', auth, clearCacheOnMutation(), catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw new AppError('Сообщение не найдено', 404);

  if (!message.deletedFor.includes(req.user.id)) {
    message.deletedFor.push(req.user.id);
    await message.save();
    console.log(`👤 Сообщение ${message._id} скрыто для пользователя ${req.user.name}`);
  }

  const ws = req.app.get('ws');
  if (ws) {
    ws.emitToUser(req.user.id, 'message_deleted', { messageId: message._id });
  }

  res.json({ success: true, message: 'Сообщение удалено для вас' });
}));

// GET /api/chats/messages/scheduled — список отложенных сообщений пользователя (только будущие)
router.get('/messages/scheduled', auth, catchAsync(async (req, res) => {
  const messages = await Message.find({
    sender: req.user.id,
    scheduledAt: { $gt: new Date() },
    deleted: false,
  })
    .populate('chat', 'type name participants')
    .sort({ scheduledAt: 1 });

  res.json({ success: true, data: messages });
}));

module.exports = { router, schedulePendingMessages };