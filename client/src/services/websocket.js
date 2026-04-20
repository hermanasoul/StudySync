// client\src\services\websocket.js

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.userId = null;
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      // Извлекаем userId из токена
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.userId = payload.id;
      } catch (e) {
        console.error('Error parsing token:', e);
      }

      this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
        query: { token }
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

    // Обработка событий учебных сессий
    this.socket.on('study_session_state', (data) => {
      this.emit('study_session_state', data);
    });

    this.socket.on('study_session_participant_joined', (data) => {
      this.emit('study_session_participant_joined', data);
    });

    this.socket.on('study_session_participant_left', (data) => {
      this.emit('study_session_participant_left', data);
    });

    this.socket.on('study_session_message', (data) => {
      this.emit('study_session_message', data);
    });

    this.socket.on('study_session_timer_update', (data) => {
      this.emit('study_session_timer_update', data);
    });

    this.socket.on('study_session_flashcard_change', (data) => {
      this.emit('study_session_flashcard_change', data);
    });

    this.socket.on('study_session_flashcard_answer', (data) => {
      this.emit('study_session_flashcard_answer', data);
    });

    this.socket.on('study_session_user_status', (data) => {
      this.emit('study_session_user_status', data);
    });

    this.socket.on('study_session_error', (data) => {
      this.emit('study_session_error', data);
    });

    // Ping-pong для поддержания соединения
    setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000);
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

  // Существующие методы для групп
  joinGroup(groupId) {
    this.send('join_group', groupId);
  }

  leaveGroup(groupId) {
    this.send('leave_group', groupId);
  }

  sendGroupMessage(groupId, content) {
    this.send('group_message', { groupId, content });
  }

  sendFlashcardStudied(flashcardId, subjectId, isCorrect) {
    this.send('flashcard-studied', {
      flashcardId,
      subjectId,
      isCorrect
    });
  }

  sendFlashcardCreated(groupId, flashcard) {
    this.send('flashcard-created', {
      groupId,
      flashcard
    });
  }

  sendNoteCreated(groupId, note) {
    this.send('note-created', {
      groupId,
      note
    });
  }

  sendInviteSent(groupId, invitedUserId) {
    this.send('invite-sent', {
      groupId,
      invitedUserId
    });
  }

  sendUserActivity(subjectId, groupId, action) {
    this.send('user-activity', {
      subjectId,
      groupId,
      action
    });
  }

  // Методы для учебных сессий
  joinStudySession(sessionId) {
    this.send('study_session_join', { sessionId });
  }

  leaveStudySession(sessionId) {
    this.send('study_session_leave', { sessionId });
  }

  sendStudySessionMessage(sessionId, content) {
    this.send('study_session_message', { sessionId, content });
  }

  updateStudySessionTimer(sessionId, timerState) {
    this.send('study_session_timer_update', { sessionId, timerState });
  }

  changeStudySessionFlashcard(sessionId, flashcardIndex) {
    this.send('study_session_flashcard_change', { sessionId, flashcardIndex });
  }

  answerStudySessionFlashcard(sessionId, flashcardId, isCorrect) {
    this.send('study_session_flashcard_answer', { sessionId, flashcardId, isCorrect });
  }

  updateStudySessionUserStatus(sessionId, status) {
    this.send('study_session_user_status', { sessionId, status });
  }

  // Вспомогательные методы для учебных сессий
  onStudySessionState(handler) {
    this.on('study_session_state', handler);
  }

  onStudySessionParticipantJoined(handler) {
    this.on('study_session_participant_joined', handler);
  }

  onStudySessionParticipantLeft(handler) {
    this.on('study_session_participant_left', handler);
  }

  onStudySessionMessage(handler) {
    this.on('study_session_message', handler);
  }

  onStudySessionTimerUpdate(handler) {
    this.on('study_session_timer_update', handler);
  }

  onStudySessionFlashcardChange(handler) {
    this.on('study_session_flashcard_change', handler);
  }

  onStudySessionFlashcardAnswer(handler) {
    this.on('study_session_flashcard_answer', handler);
  }

  onStudySessionError(handler) {
    this.on('study_session_error', handler);
  }

  // Отключение
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventHandlers.clear();
      this.userId = null;
      console.log('WebSocket disconnected');
    }
  }

  // Получение статуса подключения
  getStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      userId: this.userId
    };
  }

  // Проверка соединения
  checkConnection() {
    return this.isConnected && this.socket && this.socket.connected;
  }
}

// Создаем глобальный экземпляр
const webSocketService = new WebSocketService();

export default webSocketService;