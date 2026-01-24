// client/src/components/StudySessionCard.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studySessionsAPI } from '../services/api';
import './StudySessionCard.css';

interface StudySessionCardProps {
  session: {
    _id: string;
    name: string;
    description: string;
    host: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
    participants: Array<{
      user: {
        _id: string;
        name: string;
        avatarUrl: string;
        level: number;
      };
      role: string;
      status: string;
    }>;
    subjectId: {
      _id: string;
      name: string;
      color?: string;
      icon?: string;
    };
    groupId?: {
      _id: string;
      name: string;
    };
    accessType: 'public' | 'friends' | 'private';
    studyMode: string;
    status: string;
    participantCount: number;
    createdAt: string;
  };
  onJoin: () => void;
  onRefresh?: () => void;
}

const StudySessionCard: React.FC<StudySessionCardProps> = ({ session, onJoin, onRefresh }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const activeParticipants = session.participants.filter(p => p.status === 'active');

  const getStatusColor = () => {
    switch (session.status) {
      case 'waiting': return '#ffa726'; // оранжевый
      case 'active': return '#4caf50'; // зеленый
      case 'paused': return '#78909c'; // серый
      case 'completed': return '#9e9e9e'; // светло-серый
      default: return '#9e9e9e';
    }
  };

  const getStatusText = () => {
    switch (session.status) {
      case 'waiting': return 'Ожидание';
      case 'active': return 'Активна';
      case 'paused': return 'Пауза';
      case 'completed': return 'Завершена';
      default: return session.status;
    }
  };

  const getAccessTypeText = () => {
    switch (session.accessType) {
      case 'public': return 'Публичная';
      case 'friends': return 'Для друзей';
      case 'private': return 'Приватная';
      default: return session.accessType;
    }
  };

  const getStudyModeText = () => {
    switch (session.studyMode) {
      case 'collaborative': return 'Совместный';
      case 'individual': return 'Индивидуальный';
      case 'host-controlled': return 'Ведущий управляет';
      default: return session.studyMode;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    
    // Если больше суток, показываем дату
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month} ${hours}:${minutes}`;
  };

  const handleQuickJoin = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      // Пытаемся присоединиться к сессии
      await studySessionsAPI.join(session._id);
      
      // Если успешно, вызываем onJoin
      onJoin();
      
      // Перенаправляем в сессию
      navigate(`/study-session/${session._id}`);
    } catch (err: any) {
      console.error('Error joining session:', err);
      setError(err.response?.data?.message || 'Ошибка при присоединении');
      
      // Если ошибка, обновляем список сессий
      if (onRefresh) {
        setTimeout(() => onRefresh(), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const isHost = user?.id === session.host._id;
  const isAlreadyJoined = activeParticipants.some(p => p.user._id === user?.id);
  const isFull = activeParticipants.length >= 10; // Предполагаем максимум 10 участников

  return (
    <div className="study-session-card">
      <div className="session-header">
        <div className="session-status-badge" style={{ backgroundColor: getStatusColor() }}>
          {getStatusText()}
        </div>
        
        <div className="session-access-badge">
          {session.accessType === 'private' && '🔒'}
          {session.accessType === 'friends' && '👥'}
          {session.accessType === 'public' && '🌐'}
          <span className="access-text">{getAccessTypeText()}</span>
        </div>

        {isHost && (
          <div className="host-badge">
            👑 Ваша сессия
          </div>
        )}
      </div>

      <div className="session-content">
        <div className="session-title-row">
          <h3 className="session-title">{session.name}</h3>
          {session.groupId && (
            <div className="group-badge">
              <span className="group-icon">🏷️</span>
              {session.groupId.name}
            </div>
          )}
        </div>

        {session.description && (
          <p className="session-description">{session.description}</p>
        )}

        <div className="session-info-grid">
          <div className="info-item">
            <span className="info-icon">📚</span>
            <span className="info-label">{session.subjectId.name}</span>
          </div>
          
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span className="info-label">
              {activeParticipants.length} из {session.participantCount}
            </span>
          </div>
          
          <div className="info-item">
            <span className="info-icon">⚙️</span>
            <span className="info-label">{getStudyModeText()}</span>
          </div>
        </div>

        <div className="session-host-section">
          <div className="host-info">
            <div className="host-avatar">
              {session.host.avatarUrl ? (
                <img 
                  src={session.host.avatarUrl} 
                  alt={session.host.name}
                  className="avatar-img"
                />
              ) : (
                <div className="avatar-fallback">
                  {session.host.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="level-badge">Lvl {session.host.level}</div>
            </div>
            <div className="host-details">
              <div className="host-name">{session.host.name}</div>
              <div className="host-role">Создатель</div>
            </div>
          </div>
          
          <div className="participants-preview">
            {activeParticipants.slice(0, 3).map((participant, index) => (
              <div 
                key={participant.user._id}
                className="participant-avatar"
                style={{ marginLeft: index > 0 ? '-8px' : '0' }}
                title={participant.user.name}
              >
                {participant.user.avatarUrl ? (
                  <img 
                    src={participant.user.avatarUrl} 
                    alt={participant.user.name}
                    className="avatar-img"
                  />
                ) : (
                  <div className="avatar-fallback">
                    {participant.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="participant-level">Lvl {participant.user.level}</div>
              </div>
            ))}
            {activeParticipants.length > 3 && (
              <div className="more-participants">
                +{activeParticipants.length - 3}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="session-footer">
          <div className="session-meta">
            <div className="created-at">
              Создана {formatDate(session.createdAt)}
            </div>
            {session.status === 'active' && (
              <div className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </div>
            )}
          </div>

          <div className="session-actions">
            {isAlreadyJoined ? (
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/study-session/${session._id}`)}
              >
                {isHost ? 'Управлять' : 'Продолжить'}
              </button>
            ) : (
              <button 
                className={`btn ${isFull ? 'btn-disabled' : 'btn-primary'}`}
                onClick={handleQuickJoin}
                disabled={loading || isFull}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Присоединение...
                  </>
                ) : isFull ? (
                  'Заполнена'
                ) : (
                  'Присоединиться'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySessionCard;