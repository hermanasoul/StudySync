// client/src/pages/StudySessionRoom.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import webSocketService from '../services/websocket';
import { studySessionsAPI } from '../services/api';
import PomodoroTimer from '../components/PomodoroTimer';
import CollaborativeFlashcardViewer from '../components/CollaborativeFlashcardViewer';
import StudySessionStats from '../components/StudySessionStats';
import './StudySessionRoom.css';

interface Participant {
  user: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  role: 'host' | 'co-host' | 'participant';
  status: 'active' | 'away' | 'left';
  stats: {
    timeSpent: number;
    cardsReviewed: number;
    correctAnswers: number;
    streak: number;
  };
}

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  difficulty: string;
}

interface Session {
  _id: string;
  name: string;
  description: string;
  host: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  participants: Participant[];
  subjectId: {
    _id: string;
    name: string;
    icon?: string;
  };
  groupId?: {
    _id: string;
    name: string;
  };
  accessType: 'public' | 'friends' | 'private';
  studyMode: 'collaborative' | 'individual' | 'host-controlled';
  flashcards: Array<{
    flashcardId: Flashcard;
    reviewedBy: Array<{
      user: string;
      isCorrect: boolean;
      reviewedAt: string;
    }>;
  }>;
  currentFlashcardIndex: number;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
    autoSwitch: boolean;
  };
  timerState: {
    active: boolean;
    type: 'work' | 'break';
    startTime?: string;
    remaining: number;
    totalElapsed: number;
  };
  status: 'waiting' | 'active' | 'paused' | 'completed';
  sessionStats: {
    totalTime: number;
    totalCardsReviewed: number;
    averageSuccessRate: number;
  };
}

const StudySessionRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, webSocketConnected } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ userId: string; userName: string; content: string; timestamp: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [participantsOnline, setParticipantsOnline] = useState<Set<string>>(new Set());
  const [timerState, setTimerState] = useState<Session['timerState'] | null>(null);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [starting, setStarting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await studySessionsAPI.getById(sessionId);
      if (response.data.success) {
        const sess = response.data.session;
        setSession(sess);
        setTimerState(sess.timerState);
        setCurrentFlashcardIndex(sess.currentFlashcardIndex);
      } else {
        setError('Сессия не найдена');
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Ошибка загрузки сессии');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !webSocketConnected) return;

    webSocketService.joinStudySession(sessionId);

    const handleState = (data: any) => {
      if (data.session) setSession(data.session);
      if (data.participants) {
        const online = new Set<string>(data.participants.map((p: any) => p.userId));
        setParticipantsOnline(online);
      }
    };

    const handleParticipantJoined = (data: any) => {
      setParticipantsOnline(prev => new Set(prev).add(data.userId));
      setMessages(prev => [...prev, {
        userId: 'system',
        userName: 'Система',
        content: `${data.userName} присоединился к сессии`,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleParticipantLeft = (data: any) => {
      setParticipantsOnline(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
      setMessages(prev => [...prev, {
        userId: 'system',
        userName: 'Система',
        content: `${data.userName} покинул сессию`,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleMessage = (data: any) => {
      setMessages(prev => [...prev, {
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        timestamp: data.timestamp
      }]);
    };

    const handleTimerUpdate = (data: any) => {
      setTimerState(data.timerState);
    };

    const handleFlashcardChange = (data: any) => {
      setCurrentFlashcardIndex(data.flashcardIndex);
    };

    // Переименованный обработчик для WebSocket события
    const handleSocketFlashcardAnswer = (data: any) => {
      console.log(`User ${data.userName} answered ${data.isCorrect ? 'correctly' : 'incorrectly'}`);
    };

    const handleSessionStarted = (data: any) => {
      setSession(prev => prev ? { ...prev, status: 'active' } : null);
      setMessages(prev => [...prev, {
        userId: 'system',
        userName: 'Система',
        content: `Сессия началась! Удачи в изучении! 🎉`,
        timestamp: new Date().toISOString()
      }]);
    };

    const handleSessionCompleted = (data: any) => {
      setSession(prev => prev ? { ...prev, status: 'completed' } : null);
      setMessages(prev => [...prev, {
        userId: 'system',
        userName: 'Система',
        content: `Сессия завершена! 🏁 ${data.reason === 'all_flashcards_reviewed' ? 'Все карточки изучены!' : ''}`,
        timestamp: new Date().toISOString()
      }]);
      setTimeout(() => {
        navigate('/study-sessions');
      }, 3000);
    };

    const handleError = (data: any) => {
      setError(data.message);
    };

    const handleChatHistory = (data: any[]) => {
      setMessages(data);
    };

    webSocketService.on('study_session_state', handleState);
    webSocketService.on('study_session_participant_joined', handleParticipantJoined);
    webSocketService.on('study_session_participant_left', handleParticipantLeft);
    webSocketService.on('study_session_message', handleMessage);
    webSocketService.on('study_session_timer_update', handleTimerUpdate);
    webSocketService.on('study_session_flashcard_change', handleFlashcardChange);
    webSocketService.on('study_session_flashcard_answer', handleSocketFlashcardAnswer);
    webSocketService.on('study_session_started', handleSessionStarted);
    webSocketService.on('study_session_completed', handleSessionCompleted);
    webSocketService.on('study_session_error', handleError);
    webSocketService.on('study_session_messages', handleChatHistory);

    return () => {
      webSocketService.off('study_session_state', handleState);
      webSocketService.off('study_session_participant_joined', handleParticipantJoined);
      webSocketService.off('study_session_participant_left', handleParticipantLeft);
      webSocketService.off('study_session_message', handleMessage);
      webSocketService.off('study_session_timer_update', handleTimerUpdate);
      webSocketService.off('study_session_flashcard_change', handleFlashcardChange);
      webSocketService.off('study_session_flashcard_answer', handleSocketFlashcardAnswer);
      webSocketService.off('study_session_started', handleSessionStarted);
      webSocketService.off('study_session_completed', handleSessionCompleted);
      webSocketService.off('study_session_error', handleError);
      webSocketService.off('study_session_messages', handleChatHistory);
      webSocketService.leaveStudySession(sessionId);
    };
  }, [sessionId, webSocketConnected, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;
    webSocketService.sendStudySessionMessage(sessionId, newMessage.trim());
    setNewMessage('');
  };

  const handleTimerUpdate = (state: any) => {
    if (!sessionId) return;
    webSocketService.updateStudySessionTimer(sessionId, state);
  };

  const handleTimerComplete = (type: 'work' | 'break') => {
    console.log(`Timer ${type} completed`);
  };

  // Локальный обработчик ответа на карточку (отправка на сервер)
  const handleAnswerFlashcard = (flashcardId: string, isCorrect: boolean) => {
    if (!sessionId) return;
    webSocketService.answerStudySessionFlashcard(sessionId, flashcardId, isCorrect);
  };

  const handleNextFlashcard = () => {
    if (!sessionId || !session) return;
    const newIndex = currentFlashcardIndex + 1;
    if (newIndex < session.flashcards.length) {
      webSocketService.changeStudySessionFlashcard(sessionId, newIndex);
    }
  };

  const handlePreviousFlashcard = () => {
    if (!sessionId) return;
    const newIndex = currentFlashcardIndex - 1;
    if (newIndex >= 0) {
      webSocketService.changeStudySessionFlashcard(sessionId, newIndex);
    }
  };

  const handleJumpFlashcard = (index: number) => {
    if (!sessionId) return;
    webSocketService.changeStudySessionFlashcard(sessionId, index);
  };

  const handleLeave = async () => {
    if (!sessionId) return;
    try {
      await studySessionsAPI.leave(sessionId);
      navigate('/study-sessions');
    } catch (err) {
      console.error('Error leaving session:', err);
      navigate('/study-sessions');
    }
  };

  const handleStartSession = async () => {
    if (!sessionId) return;
    setStarting(true);
    try {
      await studySessionsAPI.start(sessionId);
      setSession(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (err) {
      console.error('Error starting session:', err);
      setError('Не удалось начать сессию');
    } finally {
      setStarting(false);
    }
  };

  const isHost = session?.host?._id === user?.id;
  const isWaiting = session?.status === 'waiting';
  const isActive = session?.status === 'active';
  const isCompleted = session?.status === 'completed';

  if (loading) {
    return (
      <div className="study-session-room loading">
        <div className="spinner"></div>
        <p>Загрузка сессии...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="study-session-room error">
        <h2>Ошибка</h2>
        <p>{error || 'Сессия не найдена'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/study-sessions')}>
          Вернуться к списку сессий
        </button>
      </div>
    );
  }

  return (
    <div className="study-session-room">
      <div className="session-header">
        <div className="session-info">
          <h1>{session.name}</h1>
          <div className="session-meta">
            <span className="subject-badge">{session.subjectId.icon} {session.subjectId.name}</span>
            {session.groupId && <span className="group-badge">🏷️ {session.groupId.name}</span>}
            <span className="access-badge">
              {session.accessType === 'public' && '🌐 Публичная'}
              {session.accessType === 'friends' && '👥 Для друзей'}
              {session.accessType === 'private' && '🔒 Приватная'}
            </span>
            <span className="mode-badge">
              {session.studyMode === 'collaborative' && '🤝 Совместный'}
              {session.studyMode === 'individual' && '👤 Индивидуальный'}
              {session.studyMode === 'host-controlled' && '🎮 Ведущий управляет'}
            </span>
          </div>
          {session.description && <p className="session-description">{session.description}</p>}
        </div>
        <div className="session-actions">
          {isHost && isWaiting && (
            <button 
              className="btn btn-success" 
              onClick={handleStartSession}
              disabled={starting}
            >
              {starting ? 'Запуск...' : '🚀 Начать сессию'}
            </button>
          )}
          <button className="btn btn-outline" onClick={() => setShowStats(true)}>
            📊 Статистика
          </button>
          <button className="btn btn-danger" onClick={handleLeave}>
            Выйти
          </button>
        </div>
      </div>

      <div className="session-status-bar">
        <div className={`status-indicator ${session.status}`}>
          {isWaiting && '⏳ Ожидание начала'}
          {isActive && '🟢 Активна'}
          {isCompleted && '🏁 Завершена'}
        </div>
        <div className="participants-count">
          👥 Участников: {session.participants.filter(p => p.status === 'active').length} онлайн ({participantsOnline.size})
        </div>
      </div>

      <div className="session-main">
        <div className="main-content">
          <div className="pomodoro-section">
            <PomodoroTimer
              workDuration={session.pomodoroSettings.workDuration}
              breakDuration={session.pomodoroSettings.breakDuration}
              autoSwitch={session.pomodoroSettings.autoSwitch}
              isActive={timerState?.active || false}
              timerType={timerState?.type || 'work'}
              remainingSeconds={timerState?.remaining || session.pomodoroSettings.workDuration * 60}
              onTimerUpdate={handleTimerUpdate}
              onTimerComplete={handleTimerComplete}
              disabled={!isActive || (session.studyMode === 'host-controlled' && !isHost)}
            />
          </div>

          <div className="flashcard-section">
            <CollaborativeFlashcardViewer
              flashcards={session.flashcards}
              currentIndex={currentFlashcardIndex}
              studyMode={session.studyMode}
              isHost={isHost}
              userId={user?.id || ''}
              onAnswer={handleAnswerFlashcard}
              onNext={handleNextFlashcard}
              onPrevious={handlePreviousFlashcard}
              onJump={handleJumpFlashcard}
              disabled={!isActive || (session.studyMode === 'host-controlled' && !isHost)}
            />
          </div>
        </div>

        <div className="chat-sidebar">
          <div className="chat-header">
            <h3>Чат сессии</h3>
          </div>
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.userId === 'system' ? 'system' : ''}`}>
                <div className="message-header">
                  <span className="message-user">{msg.userName}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Напишите сообщение..."
              disabled={!isActive}
            />
            <button type="submit" disabled={!isActive || !newMessage.trim()}>➤</button>
          </form>
        </div>
      </div>

      {showStats && session && (
        <div className="stats-modal-overlay" onClick={() => setShowStats(false)}>
          <div onClick={e => e.stopPropagation()}>
            <StudySessionStats
              sessionStats={{
                totalCards: session.flashcards.length,
                totalReviewed: session.sessionStats.totalCardsReviewed,
                totalCorrect: session.participants.reduce((sum, p) => sum + p.stats.correctAnswers, 0),
                totalTime: session.sessionStats.totalTime,
                averageSuccessRate: session.sessionStats.averageSuccessRate,
                participantCount: session.participants.length
              }}
              participants={session.participants.map(p => ({
                user: p.user,
                stats: p.stats,
                successRate: p.stats.cardsReviewed > 0
                  ? Math.round((p.stats.correctAnswers / p.stats.cardsReviewed) * 100)
                  : 0
              }))}
              leaderboard={session.participants
                .map(p => ({
                  user: p.user,
                  stats: p.stats,
                  successRate: p.stats.cardsReviewed > 0
                    ? Math.round((p.stats.correctAnswers / p.stats.cardsReviewed) * 100)
                    : 0
                }))
                .sort((a, b) => b.stats.correctAnswers - a.stats.correctAnswers)}
              onClose={() => setShowStats(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudySessionRoom;