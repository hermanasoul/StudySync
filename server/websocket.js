const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Notification = require('./models/Notification');
const StudySession = require('./models/StudySession');
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

    this.connectedUsers = new Map(); // userId -> socketId[]
    this.userRooms = new Map(); // userId -> room[]
    this.studySessions = new Map(); // sessionId -> Set of userIds
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Middleware для аутентификации
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.query.token;
        
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

      // Добавляем пользователя в список подключенных
      this.addConnectedUser(socket.userId, socket.id);

      // Присоединяем пользователя к его персональной комнате
      socket.join(`user:${socket.userId}`);

      // Отправляем статистику непрочитанных уведомлений при подключении
      this.sendNotificationStats(socket.userId);

      // Обработка входа в комнаты групп
      socket.on('join-group', (groupId) => {
        socket.join(`group:${groupId}`);
        this.addUserToRoom(socket.userId, `group:${groupId}`);
        console.log(`User ${socket.userId} joined group room: ${groupId}`);
      });

      // Обработка выхода из комнат групп
      socket.on('leave-group', (groupId) => {
        socket.leave(`group:${groupId}`);
        this.removeUserFromRoom(socket.userId, `group:${groupId}`);
        console.log(`User ${socket.userId} left group room: ${groupId}`);
      });

      // Обработка событий изучения карточек
      socket.on('flashcard-studied', (data) => {
        const { flashcardId, subjectId, isCorrect } = data;
        
        // Отправляем обновление в комнату предмета
        socket.to(`subject:${subjectId}`).emit('flashcard-updated', {
          flashcardId,
          studiedBy: {
            id: socket.userId,
            name: socket.userName
          },
          isCorrect,
          timestamp: new Date().toISOString()
        });
      });

      // Обработка создания карточки в группе
      socket.on('flashcard-created', (data) => {
        const { groupId, flashcard } = data;
        
        // Отправляем событие в комнату группы
        this.io.to(`group:${groupId}`).emit('new-flashcard', {
          flashcard,
          createdBy: {
            id: socket.userId,
            name: socket.userName
          },
          timestamp: new Date().toISOString()
        });
      });

      // Обработка создания заметки в группе
      socket.on('note-created', (data) => {
        const { groupId, note } = data;
        
        // Отправляем событие в комнату группы
        this.io.to(`group:${groupId}`).emit('new-note', {
          note,
          createdBy: {
            id: socket.userId,
            name: socket.userName
          },
          timestamp: new Date().toISOString()
        });
      });

      // Обработка приглашения в группу
      socket.on('invite-sent', (data) => {
        const { groupId, invitedUserId } = data;
        
        // Отправляем уведомление приглашенному пользователю
        this.io.to(`user:${invitedUserId}`).emit('group-invitation', {
          groupId,
          invitedBy: {
            id: socket.userId,
            name: socket.userName
          },
          timestamp: new Date().toISOString()
        });
      });

      // Обработка активности пользователя
      socket.on('user-activity', (data) => {
        const { subjectId, groupId, action } = data;
        
        // Логируем активность
        console.log(`User ${socket.userId} activity:`, {
          subjectId,
          groupId,
          action,
          timestamp: new Date().toISOString()
        });

        // Отправляем обновление статуса в комнаты
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

      // ========== ОБРАБОТКА СОБЫТИЙ УЧЕБНЫХ СЕССИЙ ==========
      
      // Присоединение к учебной сессии
      socket.on('study_session_join', async (data) => {
        try {
          const { sessionId } = data;
          console.log(`User ${socket.userId} joining study session: ${sessionId}`);

          const session = await StudySession.findById(sessionId);
          if (!session) {
            socket.emit('study_session_error', {
              message: 'Сессия не найдена'
            });
            return;
          }

          // Проверяем доступ
          if (!await this.canJoinStudySession(socket.userId, session)) {
            socket.emit('study_session_error', {
              message: 'Нет доступа к сессии'
            });
            return;
          }

          // Входим в комнату сессии
          const roomId = `study_session:${sessionId}`;
          socket.join(roomId);
          this.addUserToRoom(socket.userId, roomId);

          // Добавляем пользователя в отслеживание сессии
          if (!this.studySessions.has(sessionId)) {
            this.studySessions.set(sessionId, new Set());
          }
          this.studySessions.get(sessionId).add(socket.userId);

          // Добавляем пользователя в сессию в БД (асинхронно)
          session.addParticipant(socket.userId).catch(console.error);

          // Получаем полную информацию о сессии
          const populatedSession = await StudySession.findById(sessionId)
            .populate('host', 'name avatarUrl level')
            .populate('participants.user', 'name avatarUrl level')
            .populate('flashcards.flashcardId')
            .populate('subjectId', 'name');

          // Отправляем текущее состояние сессии новому участнику
          socket.emit('study_session_state', {
            session: populatedSession,
            participants: Array.from(this.studySessions.get(sessionId) || []).map(userId => ({
              userId,
              online: this.isUserOnline(userId)
            }))
          });

          // Уведомляем других участников о присоединении
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
          socket.emit('study_session_error', {
            message: 'Ошибка при присоединении к сессии'
          });
        }
      });

      // Выход из учебной сессии
      socket.on('study_session_leave', async (data) => {
        const { sessionId } = data;
        const roomId = `study_session:${sessionId}`;

        // Выходим из комнаты
        socket.leave(roomId);
        this.removeUserFromRoom(socket.userId, roomId);

        // Удаляем из отслеживания сессии
        if (this.studySessions.has(sessionId)) {
          this.studySessions.get(sessionId).delete(socket.userId);

          // Уведомляем других участников
          socket.to(roomId).emit('study_session_participant_left', {
            userId: socket.userId,
            userName: socket.userName,
            timestamp: new Date().toISOString()
          });

          // Если сессия пуста, удаляем ее из отслеживания
          if (this.studySessions.get(sessionId).size === 0) {
            this.studySessions.delete(sessionId);
          }
        }

        // Обновляем запись в БД (асинхронно)
        StudySession.findById(sessionId).then(session => {
          if (session) {
            session.removeParticipant(socket.userId);
          }
        }).catch(console.error);

        console.log(`User ${socket.userId} left study session: ${sessionId}`);
      });

      // Отправка сообщения в учебной сессии
      socket.on('study_session_message', (data) => {
        const { sessionId, content } = data;
        const roomId = `study_session:${sessionId}`;

        if (!socket.rooms.has(roomId)) {
          return;
        }

        const message = {
          type: 'study_session_message',
          userId: socket.userId,
          userName: socket.userName,
          userAvatar: socket.userAvatar,
          userLevel: socket.userLevel,
          content: content.substring(0, 1000),
          timestamp: new Date().toISOString()
        };

        // Отправляем сообщение всем участникам сессии, кроме отправителя
        socket.to(roomId).emit('study_session_message', message);
      });

      // Обновление таймера Pomodoro
      socket.on('study_session_timer_update', async (data) => {
        const { sessionId, timerState } = data;
        const roomId = `study_session:${sessionId}`;

        try {
          const session = await StudySession.findById(sessionId);
          if (!session || session.host.toString() !== socket.userId) {
            return; // Только хост может управлять таймером
          }

          session.timerState = timerState;
          await session.save();

          // Рассылаем обновление таймера всем участникам
          this.io.to(roomId).emit('study_session_timer_update', {
            timerState,
            updatedBy: socket.userId,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error updating study session timer:', error);
        }
      });

      // Смена карточки в учебной сессии
      socket.on('study_session_flashcard_change', async (data) => {
        const { sessionId, flashcardIndex } = data;
        const roomId = `study_session:${sessionId}`;

        try {
          const session = await StudySession.findById(sessionId);
          if (!session) return;

          // Проверяем права (только хост или co-host в режиме host-controlled)
          if (session.studyMode === 'host-controlled') {
            const participant = session.participants.find(p => 
              p.user.toString() === socket.userId
            );
            if (!participant || (participant.role !== 'host' && participant.role !== 'co-host')) {
              return;
            }
          }

          session.currentFlashcardIndex = flashcardIndex;
          await session.save();

          // Рассылаем обновление всем участникам
          this.io.to(roomId).emit('study_session_flashcard_change', {
            flashcardIndex,
            changedBy: socket.userId,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error changing flashcard in study session:', error);
        }
      });

      // Ответ на карточку в учебной сессии
      socket.on('study_session_flashcard_answer', async (data) => {
        const { sessionId, flashcardId, isCorrect } = data;
        const roomId = `study_session:${sessionId}`;

        try {
          const session = await StudySession.findById(sessionId);
          if (!session) return;

          // Обновляем статистику участника
          const participant = session.participants.find(p => 
            p.user.toString() === socket.userId
          );
          
          if (participant) {
            participant.stats.cardsReviewed += 1;
            if (isCorrect) {
              participant.stats.correctAnswers += 1;
              participant.stats.streak += 1;
            } else {
              participant.stats.streak = 0;
            }
            
            await session.save();
            
            // Обновляем статистику карточки
            const flashcard = session.flashcards.find(f => 
              f.flashcardId && f.flashcardId.toString() === flashcardId
            );
            
            if (flashcard) {
              flashcard.reviewedBy.push({
                user: socket.userId,
                isCorrect,
                reviewedAt: new Date()
              });
              await session.save();
            }
            
            // Отправляем обновление другим участникам
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

      // Обновление статуса пользователя в сессии
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

      // Запрос на получение статистики уведомлений
      socket.on('get-notification-stats', async () => {
        try {
          const unreadCount = await Notification.getUnreadCount(socket.userId);
          socket.emit('notification-stats', {
            unreadCount,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error getting notification stats:', error);
        }
      });

      // Запрос на получение информации об участниках сессии
      socket.on('get_study_session_participants', async (data) => {
        const { sessionId } = data;
        const roomId = `study_session:${sessionId}`;

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

      // Обработка отключения
      socket.on('disconnect', () => {
        console.log(`❌ WebSocket: User ${socket.userId} disconnected`);
        
        // Удаляем пользователя из всех учебных сессий
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

      // Обработка ошибок
      socket.on('error', (error) => {
        console.error(`WebSocket error for user ${socket.userId}:`, error.message);
      });
    });
  }

  // Вспомогательные методы
  addConnectedUser(userId, socketId) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    const sockets = this.connectedUsers.get(userId);
    if (!sockets.includes(socketId)) {
      sockets.push(socketId);
    }
  }

  removeConnectedUser(userId, socketId) {
    if (this.connectedUsers.has(userId)) {
      const sockets = this.connectedUsers.get(userId);
      const index = sockets.indexOf(socketId);
      if (index > -1) {
        sockets.splice(index, 1);
      }
      if (sockets.length === 0) {
        this.connectedUsers.delete(userId);
        this.userRooms.delete(userId);
      }
    }
  }

  addUserToRoom(userId, room) {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, []);
    }
    const rooms = this.userRooms.get(userId);
    if (!rooms.includes(room)) {
      rooms.push(room);
    }
  }

  removeUserFromRoom(userId, room) {
    if (this.userRooms.has(userId)) {
      const rooms = this.userRooms.get(userId);
      const index = rooms.indexOf(room);
      if (index > -1) {
        rooms.splice(index, 1);
      }
    }
  }

  // Методы для учебных сессий
  async canJoinStudySession(userId, session) {
    // Публичная сессия
    if (session.accessType === 'public') {
      return true;
    }
    
    // Приватная сессия
    if (session.accessType === 'private') {
      return session.invitedUsers.some(id => id.toString() === userId) ||
             session.participants.some(p => p.user.toString() === userId);
    }
    
    // Сессия для друзей
    if (session.accessType === 'friends') {
      const user = await User.findById(userId);
      const host = await User.findById(session.host);
      
      if (!user || !host) return false;
      
      // Проверяем, являются ли пользователи друзьями
      return user.friends.some(friend => 
        friend.userId && friend.userId.toString() === host._id.toString() && friend.status === 'accepted'
      ) || session.participants.some(p => p.user.toString() === userId);
    }
    
    return false;
  }

  handleStudySessionDisconnect(userId, sessionId) {
    const roomId = `study_session:${sessionId}`;
    
    if (this.studySessions.has(sessionId)) {
      this.studySessions.get(sessionId).delete(userId);
      
      // Уведомляем других участников
      this.io.to(roomId).emit('study_session_participant_left', {
        userId,
        timestamp: new Date().toISOString()
      });

      // Если сессия пуста, удаляем ее из отслеживания
      if (this.studySessions.get(sessionId).size === 0) {
        this.studySessions.delete(sessionId);
      }
    }
  }

  // Методы для отправки событий из других частей приложения
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToGroup(groupId, event, data) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  emitToStudySession(sessionId, event, data, excludeUserId = null) {
    const roomId = `study_session:${sessionId}`;
    if (excludeUserId) {
      this.io.to(roomId).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      this.io.to(roomId).emit(event, data);
    }
  }

  // Метод для проверки, онлайн ли пользователь
  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && 
           this.connectedUsers.get(userId).length > 0;
  }

  // Метод для получения списка онлайн пользователей в группе
  getOnlineUsersInGroup(groupId) {
    const onlineUsers = [];
    
    for (const [userId, rooms] of this.userRooms) {
      if (rooms.includes(`group:${groupId}`) && this.isUserOnline(userId)) {
        onlineUsers.push(userId);
      }
    }
    
    return onlineUsers;
  }

  // Метод для получения списка онлайн участников учебной сессии
  getOnlineParticipantsInStudySession(sessionId) {
    if (!this.studySessions.has(sessionId)) {
      return [];
    }
    
    const onlineParticipants = [];
    this.studySessions.get(sessionId).forEach(userId => {
      if (this.isUserOnline(userId)) {
        onlineParticipants.push(userId);
      }
    });
    
    return onlineParticipants;
  }

  // Метод для создания и отправки уведомления
  async sendNotification(userId, notificationData) {
    try {
      // Сохраняем уведомление в БД
      const notification = await Notification.create({
        userId,
        ...notificationData
      });

      // Отправляем через WebSocket, если пользователь онлайн
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
        console.log(`📬 Уведомление отправлено пользователю ${userId}: ${notification.title}`);
      }

      // Отправляем обновление статистики
      await this.sendNotificationStats(userId);

      return notification;
    } catch (error) {
      console.error('Ошибка при отправке уведомления:', error);
      throw error;
    }
  }

  // Метод для отправки уведомления всем участникам учебной сессии
  async sendStudySessionNotification(sessionId, notificationData, excludeUserId = null) {
    try {
      const session = await StudySession.findById(sessionId);
      if (!session) {
        console.error(`Учебная сессия ${sessionId} не найдена`);
        return [];
      }

      const notifications = [];
      for (const participant of session.participants) {
        // Пропускаем исключенного пользователя
        if (excludeUserId && participant.user.toString() === excludeUserId) {
          continue;
        }

        // Пропускаем неактивных участников
        if (participant.status !== 'active') {
          continue;
        }

        try {
          const notification = await this.sendNotification(
            participant.user.toString(),
            notificationData
          );
          notifications.push(notification);
        } catch (error) {
          console.error(`Ошибка при отправке уведомления участнику ${participant.user}:`, error);
        }
      }

      console.log(`📢 Уведомление отправлено ${notifications.length} участникам учебной сессии ${sessionId}`);
      return notifications;
    } catch (error) {
      console.error('Ошибка при отправке уведомления участникам учебной сессии:', error);
      throw error;
    }
  }

  // Метод для отправки уведомления
  sendNotificationToUser(userId, notification) {
    this.emitToUser(userId, 'notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Метод для отправки группового уведомления всем участникам группы
  sendGroupNotificationToAll(groupId, notification) {
    this.emitToGroup(groupId, 'group-notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Метод для обновления прогресса в реальном времени
  updateStudyProgress(userId, subjectId, progress) {
    this.emitToUser(userId, 'study-progress-update', {
      subjectId,
      progress,
      timestamp: new Date().toISOString()
    });
  }

  // Метод для отправки статистики уведомлений
  async sendNotificationStats(userId) {
    try {
      const unreadCount = await Notification.getUnreadCount(userId);
      if (this.isUserOnline(userId)) {
        this.emitToUser(userId, 'notification-stats', {
          unreadCount,
          timestamp: new Date().toISOString()
        });
      }
      return unreadCount;
    } catch (error) {
      console.error('Error sending notification stats:', error);
      return 0;
    }
  }

  // Метод для отправки приглашения в учебную сессию
  async sendStudySessionInvite(userId, sessionId, hostName) {
    try {
      const session = await StudySession.findById(sessionId)
        .populate('subjectId', 'name')
        .populate('host', 'name');

      if (!session) {
        throw new Error('Сессия не найдена');
      }

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