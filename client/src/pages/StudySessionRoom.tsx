// client/src/pages/StudySessionRoom.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import PomodoroTimer from '../components/PomodoroTimer';
import { useAuth } from '../context/AuthContext';
import { studySessionsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './StudySessionRoom.css';

interface StudySession {
  _id: string;
  name: string;
  description: string;
  host: { _id: string; name: string; avatarUrl?: string; level: number };
  participants: Array<{
    user: { _id: string; name: string; avatarUrl?: string; level: number };
    role: string;
    status: string;
    stats: { timeSpent: number; cardsReviewed: number; correctAnswers: number; streak: number };
  }>;
  subjectId: { _id: string; name: string } | null;
  groupId?: { _id: string; name: string };
  flashcards: Array<{
    flashcardId: { _id: string; question: string; answer: string; hint?: string };
    order: number;
    reviewedBy: any[];
  }>;
  currentFlashcardIndex: number;
  pomodoroSettings: { workDuration: number; breakDuration: number; autoSwitch: boolean };
  timerState: { active: boolean; type: 'work' | 'break'; remaining: number; totalElapsed: number };
  status: 'waiting' | 'active' | 'paused' | 'completed';
  studyMode: string;
  accessType: string;
  createdAt: string;
}

interface ChatMessage {
  _id?: string;
  userId?: { _id: string; name: string; avatarUrl?: string };
  userName?: string;
  content: string;
  createdAt: string;
  type?: 'user' | 'system';
}

const StudySessionRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await studySessionsAPI.getById(sessionId);
      setSession(res.data.session);
      // Сообщения загрузятся через WebSocket
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки сессии');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // WebSocket для сессии (однократное присоединение)
  useEffect(() => {
    if (!sessionId || joinedRef.current) return;

    const joinRoom = () => {
      console.log('📡 Присоединяемся к учебной сессии через WebSocket:', sessionId);
      webSocketService.joinStudySession(sessionId);
      joinedRef.current = true;
    };

    joinRoom();

    const handleReconnect = () => {
      console.log('🔄 WebSocket переподключился, заходим в сессию');
      // Если сокет переподключился, заново заходим
      webSocketService.joinStudySession(sessionId);
    };
    const handleConnected = () => {
      // При первом подключении тоже заходим, но только если ещё не зашли
      if (!joinedRef.current) {
        joinRoom();
      }
    };

    webSocketService.on('reconnected', handleReconnect);
    webSocketService.on('connected', handleConnected);

    const handleStateUpdate = (data: any) => {
      console.log('📦 Получено обновление состояния сессии:', data);
      if (data.session) setSession(data.session);
    };

    const handleInitialMessages = (msgs: any[]) => {
      console.log('📨 Получены начальные сообщения:', msgs);
      const chatMsgs: ChatMessage[] = msgs.map((msg: any) => ({
        _id: msg._id,
        userId: msg.userId,
        userName: msg.userName || msg.userId?.name,
        content: msg.content,
        createdAt: msg.createdAt,
      }));
      setMessages(chatMsgs);
    };

    const handleNewMessage = (msg: any) => {
      console.log('💬 Получено новое сообщение:', msg);
      const chatMsg: ChatMessage = {
        _id: msg._id || Date.now().toString(),
        userId: msg.userId,
        userName: msg.userName,
        content: msg.content,
        createdAt: msg.createdAt || new Date().toISOString(),
      };
      setMessages(prev => [...prev, chatMsg]);
    };

    const handleFlashcardChange = (data: any) => {
      setSession(prev => prev ? { ...prev, currentFlashcardIndex: data.flashcardIndex } : prev);
    };

    const handleTimerUpdate = (data: any) => {
      setSession(prev => prev ? { ...prev, timerState: data.timerState } : prev);
    };

    const handleParticipantJoined = () => loadSession();
    const handleParticipantLeft = () => loadSession();
    const handleError = (err: any) => console.error('❌ Ошибка учебной сессии:', err);

    webSocketService.on('study_session_state', handleStateUpdate);
    webSocketService.on('study_session_messages', handleInitialMessages);
    webSocketService.on('study_session_message', handleNewMessage);
    webSocketService.on('study_session_flashcard_change', handleFlashcardChange);
    webSocketService.on('study_session_timer_update', handleTimerUpdate);
    webSocketService.on('study_session_participant_joined', handleParticipantJoined);
    webSocketService.on('study_session_participant_left', handleParticipantLeft);
    webSocketService.on('study_session_error', handleError);

    return () => {
      webSocketService.leaveStudySession(sessionId);
      webSocketService.off('reconnected', handleReconnect);
      webSocketService.off('connected', handleConnected);
      webSocketService.off('study_session_state', handleStateUpdate);
      webSocketService.off('study_session_messages', handleInitialMessages);
      webSocketService.off('study_session_message', handleNewMessage);
      webSocketService.off('study_session_flashcard_change', handleFlashcardChange);
      webSocketService.off('study_session_timer_update', handleTimerUpdate);
      webSocketService.off('study_session_participant_joined', handleParticipantJoined);
      webSocketService.off('study_session_participant_left', handleParticipantLeft);
      webSocketService.off('study_session_error', handleError);
      joinedRef.current = false;
    };
  }, [sessionId, loadSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTimerUpdate = async (timerState: any) => {
    if (!session) return;
    try {
      await studySessionsAPI.updateTimer(session._id, {
        action: timerState.active ? 'start' : 'pause',
        timerType: timerState.type
      });
    } catch (err) { console.error(err); }
  };

  const handleTimerComplete = async (type: 'work' | 'break') => {};

  const subjectName = session?.subjectId?.name || 'Без предмета';
  const flashcardList = session?.flashcards || [];
  const currentIndex = session?.currentFlashcardIndex ?? 0;
  const currentFlashcard = flashcardList.length > 0 ? flashcardList[currentIndex]?.flashcardId : null;

  const handleFlashcardAction = async (action: 'next' | 'previous' | 'answer', answer?: 'correct' | 'incorrect') => {
    if (!session) return;
    try {
      await studySessionsAPI.updateFlashcards(session._id, {
        action,
        flashcardId: currentFlashcard?._id,
        answer
      });
    } catch (err) { console.error(err); }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    console.log('📤 Отправка сообщения:', newMessage);
    webSocketService.sendStudySessionMessage(sessionId!, newMessage.trim());
    setNewMessage('');
  };

  const leaveSession = async () => {
    if (!session) return;
    try {
      await studySessionsAPI.leave(session._id);
      navigate('/study-sessions');
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="study-session-room loading">
        <Header />
        <div className="spinner"></div>
        <p>Загрузка сессии...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="study-session-room error">
        <Header />
        <div className="error-message">{error || 'Сессия не найдена'}</div>
      </div>
    );
  }

  const isHost = user?.id === session.host._id;

  return (
    <div className="study-session-room">
      <Header />
      <div className="page-with-header" style={{ padding: '24px' }}>
        <div className="session-header">
          <div className="session-info">
            <h1>{session.name}</h1>
            <div className="session-meta">
              <span className="subject-badge">{subjectName}</span>
              {session.groupId && <span className="group-badge">{session.groupId.name}</span>}
              <span className="access-badge">{session.accessType === 'public' ? 'Публичная' : session.accessType === 'friends' ? 'Для друзей' : 'Приватная'}</span>
              <span className="mode-badge">{session.studyMode === 'collaborative' ? 'Совместный' : session.studyMode === 'individual' ? 'Индивидуальный' : 'Ведущий управляет'}</span>
            </div>
            {session.description && <p className="session-description">{session.description}</p>}
          </div>
          <div className="session-actions">
            {isHost && session.status !== 'completed' && (
              <>
                {session.status === 'waiting' && (
                  <button className="btn btn-outline" onClick={async () => {
                    await studySessionsAPI.start(session._id);
                    loadSession();
                  }}>Начать сессию</button>
                )}
                {session.status === 'active' && (
                  <button className="btn btn-outline" onClick={async () => {
                    await studySessionsAPI.complete(session._id);
                    loadSession();
                  }}>Завершить сессию</button>
                )}
              </>
            )}
            <button className="btn btn-danger" onClick={leaveSession}>Покинуть сессию</button>
          </div>
        </div>

        <div className="session-status-bar">
          <div className={`status-indicator ${session.status}`}>
            {session.status === 'waiting' ? 'Ожидание' : session.status === 'active' ? 'Активна' : session.status === 'completed' ? 'Завершена' : session.status}
          </div>
          <div className="participants-count">{session.participants.filter(p => p.status === 'active').length} участников онлайн</div>
        </div>

        <div className="session-main">
          <div className="main-content">
            <div className="pomodoro-section">
              <PomodoroTimer
                workDuration={session.pomodoroSettings.workDuration}
                breakDuration={session.pomodoroSettings.breakDuration}
                autoSwitch={session.pomodoroSettings.autoSwitch}
                isActive={session.timerState.active}
                timerType={session.timerState.type}
                remainingSeconds={session.timerState.remaining}
                onTimerUpdate={handleTimerUpdate}
                onTimerComplete={handleTimerComplete}
                disabled={!isHost && session.studyMode === 'host-controlled'}
              />
            </div>

            {currentFlashcard && (
              <div className="flashcard-section">
                <div className="flashcard-card" style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ marginTop: 0 }}>Карточка {currentIndex + 1} из {flashcardList.length}</h3>
                  <div className="flashcard-question" style={{ fontSize: '1.2rem', margin: '16px 0' }}>{currentFlashcard.question}</div>
                  {currentFlashcard.hint && <div className="flashcard-hint" style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', marginBottom: '12px' }}>💡 {currentFlashcard.hint}</div>}
                  <details style={{ marginBottom: '16px' }}>
                    <summary>Показать ответ</summary>
                    <div className="flashcard-answer" style={{ background: '#d1fae5', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>{currentFlashcard.answer}</div>
                  </details>
                  <div className="flashcard-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => handleFlashcardAction('previous')}>← Назад</button>
                    <button className="btn btn-outline" onClick={() => handleFlashcardAction('next')}>Далее →</button>
                    <button className="btn btn-success" onClick={() => handleFlashcardAction('answer', 'correct')}>Знаю ✓</button>
                    <button className="btn btn-danger" onClick={() => handleFlashcardAction('answer', 'incorrect')}>Не знаю ✕</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="chat-sidebar">
            <div className="chat-header">
              <h3>Чат сессии</h3>
            </div>
            <div className="chat-messages">
              {messages.map((msg, idx) => (
                <div key={msg._id || idx} className={`chat-message ${msg.type === 'system' ? 'system' : ''}`}>
                  <div className="message-header">
                    <span className="message-user">{msg.userName || msg.userId?.name || 'Система'}</span>
                    <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder="Введите сообщение..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
              <button type="submit" disabled={!newMessage.trim()}>➤</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySessionRoom;