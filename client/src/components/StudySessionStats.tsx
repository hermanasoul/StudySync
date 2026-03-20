// client/src/components/StudySessionStats.tsx

import React from 'react';
import './StudySessionStats.css';

interface ParticipantStats {
  user: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  stats: {
    timeSpent: number;
    cardsReviewed: number;
    correctAnswers: number;
    streak: number;
  };
  successRate: number;
}

interface StudySessionStatsProps {
  sessionStats: {
    totalCards: number;
    totalReviewed: number;
    totalCorrect: number;
    totalTime: number;
    averageSuccessRate: number;
    participantCount: number;
  };
  participants: ParticipantStats[];
  leaderboard: ParticipantStats[];
  onClose?: () => void;
}

const StudySessionStats: React.FC<StudySessionStatsProps> = ({
  sessionStats,
  participants,
  leaderboard,
  onClose
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} ч ${minutes} мин`;
    }
    return `${minutes} мин`;
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return '#ffd700';
      case 2: return '#c0c0c0';
      case 3: return '#cd7f32';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="session-stats-modal">
      <div className="stats-header">
        <h2>Статистика учебной сессии</h2>
        {onClose && (
          <button className="close-stats" onClick={onClose}>×</button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-value">{sessionStats.totalCards}</div>
          <div className="stats-label">Всего карточек</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{sessionStats.totalReviewed}</div>
          <div className="stats-label">Изучено карточек</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{sessionStats.totalCorrect}</div>
          <div className="stats-label">Правильных ответов</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{sessionStats.averageSuccessRate}%</div>
          <div className="stats-label">Средняя успеваемость</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{formatTime(sessionStats.totalTime)}</div>
          <div className="stats-label">Общее время</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{sessionStats.participantCount}</div>
          <div className="stats-label">Участников</div>
        </div>
      </div>

      <div className="stats-section">
        <h3>📊 Детальная статистика участников</h3>
        <div className="participants-table">
          <table>
            <thead>
              <tr>
                <th>Участник</th>
                <th>Изучено</th>
                <th>Правильно</th>
                <th>Успеваемость</th>
                <th>Серия</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(participant => (
                <tr key={participant.user._id}>
                  <td className="participant-cell">
                    <div className="participant-info">
                      {participant.user.avatarUrl ? (
                        <img
                          src={participant.user.avatarUrl}
                          alt={participant.user.name}
                          className="participant-avatar"
                        />
                      ) : (
                        <div className="participant-avatar-fallback">
                          {participant.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="participant-name">{participant.user.name}</span>
                      <span className="participant-level">Lvl {participant.user.level}</span>
                    </div>
                  </td>
                  <td>{participant.stats.cardsReviewed}</td>
                  <td>{participant.stats.correctAnswers}</td>
                  <td className={`success-rate ${participant.successRate >= 80 ? 'high' : participant.successRate >= 50 ? 'medium' : 'low'}`}>
                    {participant.successRate}%
                  </td>
                  <td>
                    {participant.stats.streak > 0 && (
                      <span className="streak-badge">
                        🔥 {participant.stats.streak}
                      </span>
                    )}
                    {participant.stats.streak === 0 && '—'}
                  </td>
                  <td>{formatTime(participant.stats.timeSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stats-section">
        <h3>🏆 Лидерборд сессии</h3>
        <div className="leaderboard-list">
          {leaderboard.map((entry, idx) => (
            <div key={entry.user._id} className="leaderboard-entry">
              <div className="leaderboard-rank" style={{ backgroundColor: getMedalColor(idx + 1) }}>
                {idx + 1}
              </div>
              <div className="leaderboard-user">
                <div className="user-avatar">
                  {entry.user.avatarUrl ? (
                    <img src={entry.user.avatarUrl} alt={entry.user.name} />
                  ) : (
                    <div className="avatar-fallback">{entry.user.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{entry.user.name}</div>
                  <div className="user-level">Уровень {entry.user.level}</div>
                </div>
              </div>
              <div className="leaderboard-stats">
                <div className="stat-item">
                  <span className="stat-value">{entry.successRate}%</span>
                  <span className="stat-label">успеваемость</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{entry.stats.correctAnswers}</span>
                  <span className="stat-label">верно</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-actions">
        <button className="btn btn-primary" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default StudySessionStats;