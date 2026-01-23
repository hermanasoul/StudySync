// server/websocket.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Notification = require('./models/Notification');
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
        const user = await User.findById(decoded.id).select('isActive name email');

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.userId = decoded.id;
        socket.userName = user.name;
        socket.userEmail = user.email;
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

      // Обработка отключения
      socket.on('disconnect', () => {
        console.log(`❌ WebSocket: User ${socket.userId} disconnected`);
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

  // Методы для отправки событий из других частей приложения
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToGroup(groupId, event, data) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
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

  // Метод для отправки группового уведомления всем участникам
  async sendGroupNotification(groupId, notificationData, excludeUserId = null) {
    try {
      const Group = require('./models/Group');
      const group = await Group.findById(groupId).populate('members.user');
      
      if (!group) {
        console.error(`Группа ${groupId} не найдена`);
        return [];
      }

      const notifications = [];
      for (const member of group.members) {
        // Пропускаем исключенного пользователя
        if (excludeUserId && member.user._id.toString() === excludeUserId) {
          continue;
        }

        try {
          const notification = await this.sendNotification(
            member.user._id.toString(),
            notificationData
          );
          notifications.push(notification);
        } catch (error) {
          console.error(`Ошибка при отправке уведомления участнику ${member.user._id}:`, error);
        }
      }

      console.log(`📢 Групповое уведомление отправлено ${notifications.length} участникам группы ${groupId}`);
      return notifications;
    } catch (error) {
      console.error('Ошибка при отправке группового уведомления:', error);
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

  // Метод для отправки уведомления всем участникам группы
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
}

module.exports = WebSocketServer;