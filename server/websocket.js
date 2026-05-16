// server/websocket.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Notification = require('./models/Notification');
const StudySession = require('./models/StudySession');
const StudySessionMessage = require('./models/StudySessionMessage');
const Flashcard = require('./models/Flashcard');
const { AppError } = require('./middleware/errorHandler');

class WebSocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.connectedUsers = new Map();
    this.userRooms = new Map();
    this.studySessions = new Map();

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('isActive name email level avatarUrl');

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.userId = decoded.id;
        socket.userName = user.name;
        socket.userEmail = user.email;
        socket.userLevel = user.level;
        socket.userAvatar = user.avatarUrl;
        next();
      } catch (error) {
        console.error('WebSocket auth error:', error.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ WebSocket: User ${socket.userId} (${socket.userName}) connected`);

      this.addConnectedUser(socket.userId, socket.id);
      socket.join(`user:${socket.userId}`);

      // ========== КОМНАТЫ ЧАТОВ ==========
      socket.on('join_chat', (chatId) => {
        socket.join(`chat:${chatId}`);
        this.addUserToRoom(socket.userId, `chat:${chatId}`);
      });

      socket.on('leave_chat', (chatId) => {
        socket.leave(`chat:${chatId}`);
        this.removeUserFromRoom(socket.userId, `chat:${chatId}`);
      });

      // ========== ГРУППОВЫЕ КОМНАТЫ ==========
      socket.on('join-group', (groupId) => {
        socket.join(`group:${groupId}`);
        this.addUserToRoom(socket.userId, `group:${groupId}`);
      });

      socket.on('leave-group', (groupId) => {
        socket.leave(`group:${groupId}`);
        this.removeUserFromRoom(socket.userId, `group:${groupId}`);
      });

      // ========== ОБРАБОТКА КАРТОЧЕК ==========
      socket.on('flashcard-studied', (data) => {
        const { flashcardId, subjectId, isCorrect } = data;
        socket.to(`subject:${subjectId}`).emit('flashcard-updated', {
          flashcardId,
          studiedBy: { id: socket.userId, name: socket.userName },
          isCorrect,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('flashcard-created', (data) => {
        const { groupId, flashcard } = data;
        this.io.to(`group:${groupId}`).emit('new-flashcard', {
          flashcard,
          createdBy: { id: socket.userId, name: socket.userName },
          timestamp: new Date().toISOString()
        });
      });

      socket.on('note-created', (data) => {
        const { groupId, note } = data;
        this.io.to(`group:${groupId}`).emit('new-note', {
          note,
          createdBy: { id: socket.userId, name: socket.userName },
          timestamp: new Date().toISOString()
        });
      });

      socket.on('invite-sent', (data) => {
        const { groupId, invitedUserId } = data;
        this.io.to(`user:${invitedUserId}`).emit('group-invitation', {
          groupId,
          invitedBy: { id: socket.userId, name: socket.userName },
          timestamp: new Date().toISOString()
        });
      });

      socket.on('user-activity', (data) => {
        const { subjectId, groupId, action } = data;
        if (subjectId) {
          socket.to(`subject:${subjectId}`).emit('user-activity-update', {
            userId: socket.userId,
            userName: socket.userName,
            action,
            timestamp: new Date().toISOString()
          });
        }
        if (groupId) {
          socket.to(`group:${groupId}`).emit('user-activity-update', {
            userId: socket.userId,
            userName: socket.userName,
            action,
            timestamp: new Date().toISOString()
          });
        }
      });

      // ========== УЧЕБНЫЕ СЕССИИ ==========
      socket.on('study_session_join', async (data) => {
        try {
          const { sessionId } = data;
          console.log(`User ${socket.userId} joining study session: ${sessionId}`);

          const session = await StudySession.findById(sessionId);
          if (!session) {
            socket.emit('study_session_error', { message: 'Сессия не найдена' });
            return;
          }

          if (!await this.canJoinStudySession(socket.userId, session)) {
            socket.emit('study_session_error', { message: 'Нет доступа к сессии' });
            return;
          }

          const roomId = `study_session:${sessionId}`;
          socket.join(roomId);
          this.addUserToRoom(socket.userId, roomId);

          if (!this.studySessions.has(sessionId)) this.studySessions.set(sessionId, new Set());
          this.studySessions.get(sessionId).add(socket.userId);
          session.addParticipant(socket.userId).catch(console.error);

          const populatedSession = await StudySession.findById(sessionId)
            .populate('host', 'name avatarUrl level')
            .populate('participants.user', 'name avatarUrl level')
            .populate('flashcards.flashcardId')
            .populate('subjectId', 'name');

          socket.emit('study_session_state', {
            session: populatedSession,
            participants: Array.from(this.studySessions.get(sessionId) || []).map(userId => ({
              userId,
              online: this.isUserOnline(userId)
            }))
          });

          // Загружаем последние 50 сообщений чата
          const mongoose = require('mongoose'); // если ещё не объявлен вверху файла
const objectId = new mongoose.Types.ObjectId(sessionId);
const lastMessages = await StudySessionMessage.find({ sessionId: objectId })
  .sort({ createdAt: -1 })
  .limit(50)
  .populate('userId', 'name avatarUrl')
  .lean();
            console.log(`📊 Найдено сообщений для сессии ${sessionId}: ${lastMessages.length}`);
          socket.emit('study_session_messages', lastMessages.reverse());

          socket.to(roomId).emit('study_session_participant_joined', {
            userId: socket.userId,
            userName: socket.userName,
            userAvatar: socket.userAvatar,
            userLevel: socket.userLevel,
            timestamp: new Date().toISOString()
          });

          console.log(`User ${socket.userId} joined study session: ${sessionId}`);
        } catch (error) {
          console.error('Error joining study session:', error);
          socket.emit('study_session_error', { message: 'Ошибка при присоединении к сессии' });
        }
      });

      socket.on('study_session_leave', async (data) => {
        const { sessionId } = data;
        const roomId = `study_session:${sessionId}`;

        socket.leave(roomId);
        this.removeUserFromRoom(socket.userId, roomId);

        if (this.studySessions.has(sessionId)) {
          this.studySessions.get(sessionId).delete(socket.userId);
          socket.to(roomId).emit('study_session_participant_left', {
            userId: socket.userId,
            userName: socket.userName,
            timestamp: new Date().toISOString()
          });
          if (this.studySessions.get(sessionId).size === 0) this.studySessions.delete(sessionId);
        }

        StudySession.findById(sessionId).then(session => {
          if (session) session.removeParticipant(socket.userId);
        }).catch(console.error);
      });

      // Отправка сообщения в учебной сессии (ИСПРАВЛЕНО)
      socket.on('study_session_message', async (data) => {
        const { sessionId, content } = data;
        const roomId = `study_session:${sessionId}`;

        try {
          // Проверяем, что пользователь является участником сессии
          const session = await StudySession.findById(sessionId);
          if (!session) {
            socket.emit('study_session_error', { message: 'Сессия не найдена' });
            return;
          }

          const isParticipant = session.participants.some(
            p => p.user.toString() === socket.userId && p.status === 'active'
          );
          const isHost = session.host.toString() === socket.userId;
          if (!isParticipant && !isHost) {
            socket.emit('study_session_error', { message: 'Вы не являетесь участником сессии' });
            return;
          }

          // Если сокет ещё не в комнате, добавляем его
          if (!socket.rooms.has(roomId)) {
            socket.join(roomId);
            this.addUserToRoom(socket.userId, roomId);
            if (!this.studySessions.has(sessionId)) this.studySessions.set(sessionId, new Set());
            this.studySessions.get(sessionId).add(socket.userId);
          }

          const message = {
            _id: null, // заполним после сохранения
            userId: socket.userId,
            userName: socket.userName,
            userAvatar: socket.userAvatar,
            userLevel: socket.userLevel,
            content: content.substring(0, 1000),
            timestamp: new Date().toISOString()
          };

          // Сохраняем сообщение в БД
          const messageDoc = new StudySessionMessage({
            sessionId,
            userId: socket.userId,
            content: content.substring(0, 1000)
          });
          const savedMessage = await messageDoc.save();
          message._id = savedMessage._id;

          // Рассылаем ВСЕМ участникам (включая отправителя)
          this.io.to(roomId).emit('study_session_message', message);
        } catch (error) {
          console.error('Failed to save/relay study session message:', error);
          socket.emit('study_session_error', { message: 'Ошибка при отправке сообщения' });
        }
      });

      // Обновление таймера Pomodoro
      socket.on('study_session_timer_update', async (data) => {
        const { sessionId, timerState } = data;
        const roomId = `study_session:${sessionId}`;
        try {
          const session = await StudySession.findById(sessionId);
          if (!session || session.host.toString() !== socket.userId) return;
          session.timerState = timerState;
          await session.save();
          this.io.to(roomId).emit('study_session_timer_update', {
            timerState,
            updatedBy: socket.userId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating study session timer:', error);
        }
      });

      // Смена карточки
      socket.on('study_session_flashcard_change', async (data) => {
        const { sessionId, flashcardIndex } = data;
        const roomId = `study_session:${sessionId}`;
        try {
          const session = await StudySession.findById(sessionId);
          if (!session) return;
          if (session.studyMode === 'host-controlled') {
            const participant = session.participants.find(p => p.user.toString() === socket.userId);
            if (!participant || (participant.role !== 'host' && participant.role !== 'co-host')) return;
          }
          session.currentFlashcardIndex = flashcardIndex;
          await session.save();
          this.io.to(roomId).emit('study_session_flashcard_change', {
            flashcardIndex,
            changedBy: socket.userId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error changing flashcard in study session:', error);
        }
      });

      // Ответ на карточку
      socket.on('study_session_flashcard_answer', async (data) => {
        const { sessionId, flashcardId, isCorrect } = data;
        const roomId = `study_session:${sessionId}`;
        try {
          const session = await StudySession.findById(sessionId);
          if (!session) return;
          const participant = session.participants.find(p => p.user.toString() === socket.userId);
          if (participant) {
            participant.stats.cardsReviewed += 1;
            if (isCorrect) {
              participant.stats.correctAnswers += 1;
              participant.stats.streak += 1;
            } else {
              participant.stats.streak = 0;
            }
            await session.save();
            const flashcard = session.flashcards.find(f => f.flashcardId && f.flashcardId.toString() === flashcardId);
            if (flashcard) {
              flashcard.reviewedBy.push({
                user: socket.userId,
                isCorrect,
                reviewedAt: new Date()
              });
              await session.save();
            }
            socket.to(roomId).emit('study_session_flashcard_answer', {
              userId: socket.userId,
              userName: socket.userName,
              flashcardId,
              isCorrect,
              streak: participant.stats.streak,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error handling flashcard answer:', error);
        }
      });

      socket.on('study_session_user_status', (data) => {
        const { sessionId, status } = data;
        const roomId = `study_session:${sessionId}`;
        if (!socket.rooms.has(roomId)) return;
        socket.to(roomId).emit('study_session_user_status', {
          userId: socket.userId,
          userName: socket.userName,
          status,
          timestamp: new Date().toISOString()
        });
      });

      // ========== УВЕДОМЛЕНИЯ ==========
      socket.on('get-notification-stats', async () => {
        try {
          const unreadCount = await Notification.getUnreadCount(socket.userId);
          socket.emit('notification-stats', { unreadCount, timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('Error getting notification stats:', error);
        }
      });

      socket.on('get_study_session_participants', async (data) => {
        const { sessionId } = data;
        if (!this.studySessions.has(sessionId)) {
          socket.emit('study_session_participants', { participants: [] });
          return;
        }
        const participants = Array.from(this.studySessions.get(sessionId)).map(userId => ({
          userId,
          online: this.isUserOnline(userId)
        }));
        socket.emit('study_session_participants', { participants });
      });

      // ========== ОТКЛЮЧЕНИЕ ==========
      socket.on('disconnect', () => {
        console.log(`❌ WebSocket: User ${socket.userId} disconnected`);
        if (this.userRooms.has(socket.userId)) {
          this.userRooms.get(socket.userId).forEach(roomId => {
            if (roomId.startsWith('study_session:')) {
              const sessionId = roomId.replace('study_session:', '');
              this.handleStudySessionDisconnect(socket.userId, sessionId);
            }
          });
        }
        this.removeConnectedUser(socket.userId, socket.id);
      });

      socket.on('error', (error) => {
        console.error(`WebSocket error for user ${socket.userId}:`, error.message);
      });
    });
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
  addConnectedUser(userId, socketId) {
    if (!this.connectedUsers.has(userId)) this.connectedUsers.set(userId, []);
    const sockets = this.connectedUsers.get(userId);
    if (!sockets.includes(socketId)) sockets.push(socketId);
  }

  removeConnectedUser(userId, socketId) {
    if (this.connectedUsers.has(userId)) {
      const sockets = this.connectedUsers.get(userId);
      const index = sockets.indexOf(socketId);
      if (index > -1) sockets.splice(index, 1);
      if (sockets.length === 0) {
        this.connectedUsers.delete(userId);
        this.userRooms.delete(userId);
      }
    }
  }

  addUserToRoom(userId, room) {
    if (!this.userRooms.has(userId)) this.userRooms.set(userId, []);
    const rooms = this.userRooms.get(userId);
    if (!rooms.includes(room)) rooms.push(room);
  }

  removeUserFromRoom(userId, room) {
    if (this.userRooms.has(userId)) {
      const rooms = this.userRooms.get(userId);
      const index = rooms.indexOf(room);
      if (index > -1) rooms.splice(index, 1);
    }
  }

  async canJoinStudySession(userId, session) {
    if (session.host.toString() === userId) return true;
    if (session.participants.some(p => p.user.toString() === userId)) return true;
    if (session.accessType === 'public') return true;
    if (session.accessType === 'private') {
      return session.invitedUsers.some(id => id.toString() === userId);
    }
    if (session.accessType === 'friends') {
      const host = await User.findById(session.host);
      if (!host) return false;
      return host.friends.some(friend =>
        friend.userId && friend.userId.toString() === userId && friend.status === 'accepted'
      );
    }
    return false;
  }

  handleStudySessionDisconnect(userId, sessionId) {
    const roomId = `study_session:${sessionId}`;
    if (this.studySessions.has(sessionId)) {
      this.studySessions.get(sessionId).delete(userId);
      this.io.to(roomId).emit('study_session_participant_left', {
        userId,
        timestamp: new Date().toISOString()
      });
      if (this.studySessions.get(sessionId).size === 0) this.studySessions.delete(sessionId);
    }
  }

  emitToUser(userId, event, data) { this.io.to(`user:${userId}`).emit(event, data); }
  emitToGroup(groupId, event, data) { this.io.to(`group:${groupId}`).emit(event, data); }

  emitToChat(chatId, event, data, excludeUserId = null) {
    const room = `chat:${chatId}`;
    if (excludeUserId) {
      this.io.to(room).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      this.io.to(room).emit(event, data);
    }
  }

  emitToStudySession(sessionId, event, data, excludeUserId = null) {
    const roomId = `study_session:${sessionId}`;
    if (excludeUserId) {
      this.io.to(roomId).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  isUserOnline(userId) { return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).length > 0; }

  getOnlineUsersInGroup(groupId) {
    const onlineUsers = [];
    for (const [userId, rooms] of this.userRooms) {
      if (rooms.includes(`group:${groupId}`) && this.isUserOnline(userId)) onlineUsers.push(userId);
    }
    return onlineUsers;
  }

  getOnlineParticipantsInStudySession(sessionId) {
    if (!this.studySessions.has(sessionId)) return [];
    const onlineParticipants = [];
    this.studySessions.get(sessionId).forEach(userId => {
      if (this.isUserOnline(userId)) onlineParticipants.push(userId);
    });
    return onlineParticipants;
  }

  async sendNotification(userId, notificationData) {
    try {
      const notification = await Notification.create({ userId, ...notificationData });
      if (this.isUserOnline(userId)) {
        const notificationToSend = {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          formattedDate: notification.formattedDate
        };
        this.emitToUser(userId, 'notification', notificationToSend);
      }
      await this.sendNotificationStats(userId);
      return notification;
    } catch (error) {
      console.error('Ошибка при отправке уведомления:', error);
      throw error;
    }
  }

  async sendGroupNotification(groupId, notificationData, excludeUserId = null) {
    try {
      const group = await require('./models/Group').findById(groupId);
      if (!group) return [];
      const notifications = [];
      for (const member of group.members) {
        const userId = member.user.toString();
        if (excludeUserId && userId === excludeUserId) continue;
        try {
          notifications.push(await this.sendNotification(userId, notificationData));
        } catch (error) {
          console.error(`Ошибка при отправке уведомления участнику ${userId}:`, error);
        }
      }
      return notifications;
    } catch (error) {
      console.error('Ошибка при отправке уведомления участникам группы:', error);
      throw error;
    }
  }

  async sendStudySessionNotification(sessionId, notificationData, excludeUserId = null) {
    try {
      const session = await StudySession.findById(sessionId);
      if (!session) return [];
      const notifications = [];
      for (const participant of session.participants) {
        if (excludeUserId && participant.user.toString() === excludeUserId) continue;
        if (participant.status !== 'active') continue;
        try {
          notifications.push(await this.sendNotification(participant.user.toString(), notificationData));
        } catch (error) {
          console.error(`Ошибка при отправке уведомления участнику ${participant.user}:`, error);
        }
      }
      return notifications;
    } catch (error) {
      console.error('Ошибка при отправке уведомления участникам учебной сессии:', error);
      throw error;
    }
  }

  sendNotificationToUser(userId, notification) {
    this.emitToUser(userId, 'notification', { ...notification, timestamp: new Date().toISOString() });
  }

  sendGroupNotificationToAll(groupId, notification) {
    this.emitToGroup(groupId, 'group-notification', { ...notification, timestamp: new Date().toISOString() });
  }

  updateStudyProgress(userId, subjectId, progress) {
    this.emitToUser(userId, 'study-progress-update', { subjectId, progress, timestamp: new Date().toISOString() });
  }

  async sendNotificationStats(userId) {
    try {
      const unreadCount = await Notification.getUnreadCount(userId);
      if (this.isUserOnline(userId)) {
        this.emitToUser(userId, 'notification-stats', { unreadCount, timestamp: new Date().toISOString() });
      }
      return unreadCount;
    } catch (error) {
      console.error('Error sending notification stats:', error);
      return 0;
    }
  }

  async sendStudySessionInvite(userId, sessionId, hostName) {
    try {
      const session = await StudySession.findById(sessionId).populate('subjectId', 'name').populate('host', 'name');
      if (!session) throw new Error('Сессия не найдена');
      const notification = await this.sendNotification(userId, {
        type: 'study_session_invite',
        title: 'Приглашение в учебную сессию',
        message: `${hostName || session.host.name} приглашает вас в учебную сессию "${session.name}" по предмету ${session.subjectId.name}`,
        data: {
          sessionId: session._id,
          sessionName: session.name,
          subjectName: session.subjectId.name,
          hostId: session.host._id,
          hostName: hostName || session.host.name
        }
      });
      return notification;
    } catch (error) {
      console.error('Error sending study session invite:', error);
      throw error;
    }
  }
}

module.exports = WebSocketServer;