// client/src/services/websocket.js

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
      
      if (reason === 'io server disconnect') {
        // Сервер отключил нас, нужно переподключиться
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.isConnected = false;
      this.reconnectAttempts++;
      this.emit('connection-error', error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 WebSocket reconnect attempt ${attempt}`);
      this.emit('reconnect-attempt', attempt);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`✅ WebSocket reconnected after ${attempt} attempts`);
      this.isConnected = true;
      this.emit('reconnected', attempt);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnect failed');
      this.emit('reconnect-failed');
    });

    // Обработка пользовательских событий
    this.socket.on('new-flashcard', (data) => {
      this.emit('new-flashcard', data);
    });

    this.socket.on('new-note', (data) => {
      this.emit('new-note', data);
    });

    this.socket.on('member-joined', (data) => {
      this.emit('member-joined', data);
    });

    this.socket.on('flashcard-updated', (data) => {
      this.emit('flashcard-updated', data);
    });

    this.socket.on('user-activity-update', (data) => {
      this.emit('user-activity-update', data);
    });

    this.socket.on('group-invitation', (data) => {
      this.emit('group-invitation', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('group-notification', (data) => {
      this.emit('group-notification', data);
    });

    this.socket.on('study-progress-update', (data) => {
      this.emit('study-progress-update', data);
    });
  }

  // Подписка на события
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // Отписка от событий
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Вызов обработчиков событий
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Отправка событий на сервер
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot send event ${event}: WebSocket not connected`);
    }
  }

  // Присоединение к комнате группы
  joinGroup(groupId) {
    this.send('join-group', groupId);
  }

  // Выход из комнаты группы
  leaveGroup(groupId) {
    this.send('leave-group', groupId);
  }

  // Отправка события изучения карточки
  sendFlashcardStudied(flashcardId, subjectId, isCorrect) {
    this.send('flashcard-studied', {
      flashcardId,
      subjectId,
      isCorrect
    });
  }

  // Отправка события создания карточки
  sendFlashcardCreated(groupId, flashcard) {
    this.send('flashcard-created', {
      groupId,
      flashcard
    });
  }

  // Отправка события создания заметки
  sendNoteCreated(groupId, note) {
    this.send('note-created', {
      groupId,
      note
    });
  }

  // Отправка события приглашения
  sendInviteSent(groupId, invitedUserId) {
    this.send('invite-sent', {
      groupId,
      invitedUserId
    });
  }

  // Отправка события активности пользователя
  sendUserActivity(subjectId, groupId, action) {
    this.send('user-activity', {
      subjectId,
      groupId,
      action
    });
  }

  // Отключение
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
      console.log('WebSocket disconnected');
    }
  }

  // Получение статуса подключения
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Создаем глобальный экземпляр
const webSocketService = new WebSocketService();

export default webSocketService;