import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import LevelProgress from '../components/LevelProgress';
import './LevelsPage.css';
import { levelsAPI } from '../services/api';

interface LevelLeaderboardUser {
  id: string;
  rank: number;
  name: string;
  level: number;
  experiencePoints: number;
  createdAt: string;
}

interface ExperienceHistory {
  id: string;
  reason: string;
  reasonLabel: string;
  points: number;
  newTotal: number;
  createdAt: string;
}

interface LevelStats {
  totalUsers: number;
  averageLevel: number;
  averageExperience: number;
  topLevelUser?: {
    name: string;
    level: number;
    experiencePoints: number;
  };
}

const LevelsPage: React.FC = () => {
  const [progress, setProgress] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LevelLeaderboardUser[]>([]);
  const [experienceHistory, setExperienceHistory] = useState<ExperienceHistory[]>([]);
  const [stats, setStats] = useState<LevelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'progress' | 'leaderboard' | 'history'>('progress');
  const [sortBy, setSortBy] = useState<'level' | 'experience'>('level');

  const loadExperienceHistory = useCallback(async () => {
    try {
      const response = await levelsAPI.getExperienceHistory({ limit: 20 });
      if (response.data.success) {
        setExperienceHistory(response.data.history);
      }
    } catch (error) {
      console.error('Error loading experience history:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const progressResponse = await levelsAPI.getMyProgress();
      if (progressResponse.data.success) {
        setProgress(progressResponse.data.progress);
      }
      
      const leaderboardResponse = await levelsAPI.getLeaderboard({ 
        limit: 10, 
        sortBy 
      });
      if (leaderboardResponse.data.success) {
        setLeaderboard(leaderboardResponse.data.leaderboard);
      }
      
      const statsResponse = await levelsAPI.getStats();
      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
      
      if (activeTab === 'history') {
        await loadExperienceHistory();
      }
    } catch (error) {
      console.error('Error loading levels data:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, activeTab, loadExperienceHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getReasonIcon = (reason: string) => {
    const icons: { [key: string]: string } = {
      achievement: '🏆',
      daily_login: '📅',
      flashcard_created: '🗂️',
      note_created: '📝',
      group_created: '👥',
      member_invited: '📨',
      flashcard_studied: '🎯',
      streak_bonus: '🔥',
      profile_completed: '👤',
      activity_bonus: '⚡',
      level_up: '⭐'
    };
    return icons[reason] || '🎁';
  };

  const getReasonColor = (reason: string) => {
    const colors: { [key: string]: string } = {
      achievement: '#8b5cf6',
      daily_login: '#3b82f6',
      flashcard_created: '#10b981',
      note_created: '#f59e0b',
      group_created: '#ec4899',
      member_invited: '#06b6d4',
      flashcard_studied: '#ef4444',
      streak_bonus: '#f97316',
      profile_completed: '#84cc16',
      activity_bonus: '#6366f1',
      level_up: '#fbbf24'
    };
    return colors[reason] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="levels-page">
        <Header />
        <div className="loading">Загрузка информации об уровнях...</div>
      </div>
    );
  }

  return (
    <div className="levels-page">
      <Header />
      <div className="levels-container">
        <div className="levels-header">
          <h1>⭐ Система уровней</h1>
          <p>Повышайте уровень, зарабатывая опыт за активность в приложении</p>
        </div>

        <div className="levels-content">
          <div className="levels-main">
            <div className="levels-tabs">
              <button
                className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                Мой прогресс
              </button>
              <button
                className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('leaderboard')}
              >
                Лидерборд
              </button>
              <button
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('history');
                  loadExperienceHistory();
                }}
              >
                История опыта
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'progress' && progress && (
                <div className="progress-tab">
                  <LevelProgress showDetails={true} />
                  
                  {stats && (
                    <div className="levels-stats">
                      <h3>📊 Общая статистика</h3>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-icon">👥</div>
                          <div className="stat-info">
                            <div className="stat-number">{stats.totalUsers}</div>
                            <div className="stat-label">Всего пользователей</div>
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-icon">📈</div>
                          <div className="stat-info">
                            <div className="stat-number">{Math.round(stats.averageLevel)}</div>
                            <div className="stat-label">Средний уровень</div>
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-icon">🎯</div>
                          <div className="stat-info">
                            <div className="stat-number">{Math.round(stats.averageExperience)}</div>
                            <div className="stat-label">Средний опыт</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="leaderboard-tab">
                  <div className="leaderboard-header">
                    <h3>🏆 Лидерборд уровней</h3>
                    <div className="sort-options">
                      <button
                        className={`sort-btn ${sortBy === 'level' ? 'active' : ''}`}
                        onClick={() => setSortBy('level')}
                      >
                        По уровню
                      </button>
                      <button
                        className={`sort-btn ${sortBy === 'experience' ? 'active' : ''}`}
                        onClick={() => setSortBy('experience')}
                      >
                        По опыту
                      </button>
                    </div>
                  </div>
                  
                  <div className="leaderboard-list">
                    <div className="leaderboard-row header">
                      <div className="col-rank">Ранг</div>
                      <div className="col-user">Пользователь</div>
                      <div className="col-level">Уровень</div>
                      <div className="col-exp">Опыт</div>
                    </div>
                    
                    {leaderboard.map((user) => (
                      <div 
                        key={user.id} 
                        className={`leaderboard-row ${progress?.rank === user.rank ? 'current-user' : ''}`}
                      >
                        <div className="col-rank">
                          <span className={`rank-badge rank-${user.rank}`}>
                            {user.rank}
                          </span>
                        </div>
                        <div className="col-user">
                          <div className="user-info">
                            <div className="user-avatar">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="user-details">
                              <div className="user-name">{user.name}</div>
                              <div className="user-join">
                                {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-level">
                          <div className="level-display">
                            <span className="level-number">{user.level}</span>
                          </div>
                        </div>
                        <div className="col-exp">
                          <div className="exp-display">
                            {user.experiencePoints.toLocaleString()} XP
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {progress && (
                    <div className="my-position">
                      <h4>Моя позиция</h4>
                      <div className="position-card">
                        <div className="position-rank">#{progress.rank}</div>
                        <div className="position-details">
                          <div className="position-level">
                            Уровень {progress.level} • {progress.experiencePoints.toLocaleString()} XP
                          </div>
                          <div className="position-percentile">
                            Вы выше {100 - progress.percentile}% пользователей
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="history-tab">
                  <h3>📜 История получения опыта</h3>
                  
                  {experienceHistory.length === 0 ? (
                    <div className="no-history">
                      <div className="empty-icon">📊</div>
                      <h4>История опыта пуста</h4>
                      <p>Здесь будут отображаться все полученные вами очки опыта</p>
                    </div>
                  ) : (
                    <div className="history-list">
                      {experienceHistory.map((item) => (
                        <div key={item.id} className="history-item">
                          <div 
                            className="history-icon"
                            style={{ backgroundColor: getReasonColor(item.reason) + '20' }}
                          >
                            {getReasonIcon(item.reason)}
                          </div>
                          <div className="history-details">
                            <div className="history-reason">
                              <span className="reason-text">{item.reasonLabel}</span>
                              <span className="history-date">
                                {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                            <div className="history-points">
                              <span className="points-change">+{item.points} XP</span>
                              <span className="points-total">Всего: {item.newTotal} XP</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="levels-sidebar">
            <div className="sidebar-card">
              <h3>🎯 Как повысить уровень?</h3>
              <ul className="tips-list">
                <li className="tip-item">
                  <span className="tip-icon">🏆</span>
                  <span className="tip-text">Получайте достижения</span>
                </li>
                <li className="tip-item">
                  <span className="tip-icon">🗂️</span>
                  <span className="tip-text">Создавайте карточки</span>
                </li>
                <li className="tip-item">
                  <span className="tip-icon">📝</span>
                  <span className="tip-text">Пишите заметки</span>
                </li>
                <li className="tip-item">
                  <span className="tip-icon">👥</span>
                  <span className="tip-text">Создавайте группы</span>
                </li>
                <li className="tip-item">
                  <span className="tip-icon">📨</span>
                  <span className="tip-text">Приглашайте друзей</span>
                </li>
                <li className="tip-item">
                  <span className="tip-icon">📅</span>
                  <span className="tip-text">Заходите ежедневно</span>
                </li>
              </ul>
            </div>

            {stats && stats.topLevelUser && (
              <div className="sidebar-card">
                <h3>👑 Лучшие игроки</h3>
                <div className="top-player">
                  <div className="player-avatar">
                    {stats.topLevelUser.name?.charAt(0)?.toUpperCase() || 'T'}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{stats.topLevelUser.name}</div>
                    <div className="player-stats">
                      <span className="player-level">Уровень {stats.topLevelUser.level}</span>
                      <span className="player-exp">{stats.topLevelUser.experiencePoints} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="sidebar-card">
              <h3>📈 Ваша статистика</h3>
              {progress && (
                <div className="user-stats">
                  <div className="stat-item">
                    <div className="stat-label">Общий ранг</div>
                    <div className="stat-value">#{progress.rank}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Уровень</div>
                    <div className="stat-value">{progress.level}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Всего опыта</div>
                    <div className="stat-value">{progress.experiencePoints.toLocaleString()} XP</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Очков достижений</div>
                    <div className="stat-value">{progress.totalAchievementPoints}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelsPage;