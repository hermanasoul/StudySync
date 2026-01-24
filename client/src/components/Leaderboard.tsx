import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leaderboardsAPI } from '../services/api';
import './Leaderboard.css';

interface Ranking {
  userId: string;
  rank: number;
  score: number;
  metric: string;
  details: {
    name: string;
    avatarUrl: string;
    level: number;
    additionalStats: any;
  };
  previousRank?: number;
  rankChange?: number;
}

interface LeaderboardData {
  leaderboard: {
    type: string;
    metric: string;
    period: {
      startDate: string;
      endDate: string;
    };
    lastUpdated: string;
    rankings: Ranking[];
  };
  userRank: {
    rank: number;
    score: number;
    totalParticipants: number;
    percentile: number;
  } | null;
  totalParticipants: number;
}

const Leaderboard: React.FC<{
  type?: 'global' | 'group' | 'subject' | 'weekly' | 'monthly';
  scopeId?: string;
  scopeName?: string;
  title?: string;
  compact?: boolean;
}> = ({ 
  type = 'global', 
  scopeId, 
  scopeName, 
  title,
  compact = false 
}) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'experience' | 'level' | 'achievements' | 'streak'>('experience');
  const [timeRange, setTimeRange] = useState<'all' | 'weekly' | 'monthly'>('all');

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user, type, scopeId, metric, timeRange]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      let params: any = { metric };
      
      switch (type) {
        case 'global':
          endpoint = '/leaderboards/global';
          break;
        case 'group':
          endpoint = `/leaderboards/group/${scopeId}`;
          break;
        case 'subject':
          endpoint = `/leaderboards/subject/${scopeId}`;
          break;
        case 'weekly':
          endpoint = '/leaderboards/weekly';
          break;
        case 'monthly':
          endpoint = '/leaderboards/monthly';
          break;
      }
      
      if (timeRange !== 'all' && type === 'global') {
        endpoint = `/leaderboards/${timeRange}`;
      }
      
      const response = await leaderboardsAPI.get(endpoint, { params });
      if (response.data.success) {
        setLeaderboard(response.data.data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankChangeIcon = (change?: number) => {
    if (!change) return null;
    
    if (change > 0) {
      return <span className="rank-change up">↑ {Math.abs(change)}</span>;
    } else if (change < 0) {
      return <span className="rank-change down">↓ {Math.abs(change)}</span>;
    }
    return <span className="rank-change same">→</span>;
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'experience': return 'Опыт';
      case 'level': return 'Уровень';
      case 'achievements': return 'Достижения';
      case 'streak': return 'Серия';
      default: return metric;
    }
  };

  const formatScore = (score: number, metric: string) => {
    switch (metric) {
      case 'experience':
      case 'achievements':
        return score.toLocaleString();
      case 'level':
        return `${score} уровень`;
      case 'streak':
        return `${score} дней`;
      default:
        return score;
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return '#ffd700';
    if (level >= 30) return '#c0c0c0';
    if (level >= 20) return '#cd7f32';
    if (level >= 10) return '#8b5cf6';
    return '#3b82f6';
  };

  if (!user) {
    return <div className="leaderboard-container">Пожалуйста, войдите в систему.</div>;
  }

  return (
    <div className={`leaderboard-container ${compact ? 'compact' : ''}`}>
      <div className="leaderboard-header">
        <div className="header-left">
          <h2>{title || `${getMetricLabel(metric)} Лидерборд`}</h2>
          {scopeName && (
            <div className="scope-name">{scopeName}</div>
          )}
          {leaderboard && (
            <div className="leaderboard-meta">
              <span className="meta-item">
                Обновлено: {new Date(leaderboard.leaderboard.lastUpdated).toLocaleDateString('ru-RU')}
              </span>
              <span className="meta-item">
                Участников: {leaderboard.totalParticipants}
              </span>
              {leaderboard.leaderboard.period && (
                <span className="meta-item">
                  Период: {new Date(leaderboard.leaderboard.period.startDate).toLocaleDateString('ru-RU')} - {' '}
                  {new Date(leaderboard.leaderboard.period.endDate).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="header-right">
          {type === 'global' && (
            <div className="time-range-selector">
              <button
                className={`time-range-btn ${timeRange === 'all' ? 'active' : ''}`}
                onClick={() => setTimeRange('all')}
              >
                Все время
              </button>
              <button
                className={`time-range-btn ${timeRange === 'weekly' ? 'active' : ''}`}
                onClick={() => setTimeRange('weekly')}
              >
                Неделя
              </button>
              <button
                className={`time-range-btn ${timeRange === 'monthly' ? 'active' : ''}`}
                onClick={() => setTimeRange('monthly')}
              >
                Месяц
              </button>
            </div>
          )}
          
          <div className="metric-selector">
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="metric-select"
            >
              <option value="experience">По опыту</option>
              <option value="level">По уровню</option>
              <option value="achievements">По достижениям</option>
              <option value="streak">По серии</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка лидерборда...</div>
      ) : leaderboard ? (
        <>
          {/* Позиция текущего пользователя */}
          {leaderboard.userRank && (
            <div className="user-position">
              <div className="position-card">
                <div className="position-header">
                  <h3>Ваша позиция</h3>
                  <div className="position-rank">
                    {getRankIcon(leaderboard.userRank.rank)}
                    <span className="rank-number">{leaderboard.userRank.rank}</span>
                  </div>
                </div>
                <div className="position-stats">
                  <div className="stat">
                    <span className="stat-label">Очки:</span>
                    <span className="stat-value">
                      {formatScore(leaderboard.userRank.score, metric)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Процентиль:</span>
                    <span className="stat-value">{leaderboard.userRank.percentile}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Участников:</span>
                    <span className="stat-value">{leaderboard.userRank.totalParticipants}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Таблица лидеров */}
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="header-cell rank-cell">Место</div>
              <div className="header-cell user-cell">Пользователь</div>
              <div className="header-cell score-cell">Очки</div>
              <div className="header-cell level-cell">Уровень</div>
              {!compact && <div className="header-cell change-cell">Изменение</div>}
            </div>
            
            <div className="table-body">
              {leaderboard.leaderboard.rankings.map((ranking, index) => (
                <div 
                  key={`${ranking.userId}-${index}`}
                  className={`table-row ${ranking.userId === user?.id ? 'current-user' : ''}`}
                >
                  <div className="cell rank-cell">
                    <div className="rank-icon">{getRankIcon(ranking.rank)}</div>
                    <div className="rank-number">{ranking.rank}</div>
                  </div>
                  
                  <div className="cell user-cell">
                    <div className="user-avatar">
                      {ranking.details.avatarUrl ? (
                        <img src={ranking.details.avatarUrl} alt={ranking.details.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {ranking.details.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{ranking.details.name}</div>
                      {!compact && ranking.details.additionalStats && (
                        <div className="user-stats">
                          {ranking.details.additionalStats.achievements && (
                            <span className="stat-badge">
                              🏆 {ranking.details.additionalStats.achievements}
                            </span>
                          )}
                          {ranking.details.additionalStats.streak && (
                            <span className="stat-badge">
                              🔥 {ranking.details.additionalStats.streak}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="cell score-cell">
                    <div className="score-value">
                      {formatScore(ranking.score, metric)}
                    </div>
                  </div>
                  
                  <div className="cell level-cell">
                    <div 
                      className="level-badge"
                      style={{ backgroundColor: getLevelColor(ranking.details.level) }}
                    >
                      {ranking.details.level}
                    </div>
                  </div>
                  
                  {!compact && (
                    <div className="cell change-cell">
                      {getRankChangeIcon(ranking.rankChange)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {compact && leaderboard.leaderboard.rankings.length > 5 && (
            <div className="view-all-link">
              <a href={`/leaderboards/${type}${scopeId ? `/${scopeId}` : ''}`}>
                Посмотреть полный список →
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="empty-leaderboard">
          <div className="empty-icon">🏆</div>
          <h4>Лидерборд пока пуст</h4>
          <p>Будьте первым, кто достигнет вершины!</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;