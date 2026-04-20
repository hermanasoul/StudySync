import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import AchievementsList from '../components/AchievementsList';
import AchievementProgress from '../components/AchievementProgress';
import { achievementsAPI, Achievement } from '../services/api';
import './AchievementsPage.css';

const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);   // <-- убрали несуществующий тип
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'progress' | 'leaderboard'>('all');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myPosition, setMyPosition] = useState<any>(null);

  useEffect(() => {
    loadAchievements();
    loadUserAchievements();
    loadProgress();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
      loadMyPosition();
    }
  }, [activeTab]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await achievementsAPI.getAll();
      if (response.data.success) {
        setAchievements(response.data.achievements);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAchievements = async () => {
    try {
      const response = await achievementsAPI.getMy();
      if (response.data.success) {
        setUserAchievements(response.data.achievements);
      }
    } catch (error) {
      console.error('Error loading user achievements:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await achievementsAPI.getProgress();
      if (response.data.success) {
        setProgress(response.data.progress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await achievementsAPI.getLeaderboard({ limit: 10 });
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const loadMyPosition = async () => {
    try {
      const response = await achievementsAPI.getMyPosition();
      if (response.data.success) {
        setMyPosition(response.data);
      }
    } catch (error) {
      console.error('Error loading my position:', error);
    }
  };

  const handleAchievementClick = (achievement: Achievement) => {
    console.log('Achievement clicked:', achievement);
    // Можно открыть модальное окно с деталями достижения
  };

  const renderTabs = () => (
    <div className="achievements-tabs">
      <button
        className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        onClick={() => setActiveTab('all')}
      >
        Все достижения
      </button>
      <button
        className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
        onClick={() => setActiveTab('my')}
      >
        Мои достижения
      </button>
      <button
        className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
        onClick={() => setActiveTab('progress')}
      >
        Прогресс
      </button>
      <button
        className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('leaderboard')}
      >
        Рейтинг
      </button>
    </div>
  );

  const renderAllAchievements = () => (
    <div className="achievements-section">
      <div className="section-header">
        <h2>Все достижения</h2>
        <p>Разблокируйте достижения для получения очков и повышения вашего рейтинга</p>
      </div>
      <AchievementsList
        achievements={achievements}
        loading={loading}
        showFilters={true}
        onAchievementClick={handleAchievementClick}
      />
    </div>
  );

  const renderMyAchievements = () => {
    const myAchievementsList = userAchievements.map(ua => ({
      ...ua.achievement,
      progress: ua.progress,
      isUnlocked: ua.isUnlocked,
      unlockedAt: ua.unlockedAt
    }));

    return (
      <div className="achievements-section">
        <div className="section-header">
          <h2>Мои достижения</h2>
          <p>Достижения, которые вы уже получили или находитесь в процессе получения</p>
        </div>
        <AchievementsList
          achievements={myAchievementsList}
          loading={loading}
          emptyMessage="У вас пока нет достижений"
          showFilters={true}
          onAchievementClick={handleAchievementClick}
        />
      </div>
    );
  };

  const renderProgress = () => (
    <div className="achievements-section">
      <div className="section-header">
        <h2>Мой прогресс</h2>
        <p>Статистика по вашим достижениям и их категориям</p>
      </div>
      {progress ? (
        <AchievementProgress progress={progress} />
      ) : (
        <div className="loading">Загрузка прогресса...</div>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="achievements-section">
      <div className="section-header">
        <h2>Рейтинг пользователей</h2>
        <p>Топ пользователей по количеству очков за достижения</p>
      </div>
      
      {myPosition && (
        <div className="my-position-card">
          <div className="my-position-header">
            <h3>Моя позиция в рейтинге</h3>
            <div className="position-rank">#{myPosition.position}</div>
          </div>
          <div className="my-position-stats">
            <div className="position-stat">
              <div className="stat-value">{myPosition.userStats.totalPoints}</div>
              <div className="stat-label">Всего очков</div>
            </div>
            <div className="position-stat">
              <div className="stat-value">{myPosition.userStats.unlockedCount}</div>
              <div className="stat-label">Достижений</div>
            </div>
            <div className="position-stat">
              <div className="stat-value">
                {myPosition.userStats.lastUnlock 
                  ? new Date(myPosition.userStats.lastUnlock).toLocaleDateString('ru-RU')
                  : 'Нет'
                }
              </div>
              <div className="stat-label">Последнее</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <div className="leaderboard-col rank">Ранг</div>
          <div className="leaderboard-col user">Пользователь</div>
          <div className="leaderboard-col points">Очки</div>
          <div className="leaderboard-col achievements">Достижений</div>
          <div className="leaderboard-col last">Последнее</div>
        </div>
        
        <div className="leaderboard-list">
          {leaderboard.length === 0 ? (
            <div className="no-leaderboard">Рейтинг пуст</div>
          ) : (
            leaderboard.map(user => (
              <div key={user.userId} className="leaderboard-row">
                <div className="leaderboard-col rank">
                  <span className={`rank-badge rank-${user.rank}`}>
                    {user.rank}
                  </span>
                </div>
                <div className="leaderboard-col user">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.userAvatar ? (
                        <img src={user.userAvatar} alt={user.userName} />
                      ) : (
                        <span>{user.userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <span className="user-name">{user.userName}</span>
                  </div>
                </div>
                <div className="leaderboard-col points">
                  <span className="points-value">{user.totalPoints}</span>
                </div>
                <div className="leaderboard-col achievements">
                  {user.unlockedCount}
                </div>
                <div className="leaderboard-col last">
                  {user.lastUnlock 
                    ? new Date(user.lastUnlock).toLocaleDateString('ru-RU')
                    : '-'
                  }
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="achievements-page">
      <Header />
      <div className="achievements-container">
        <div className="achievements-header">
          <h1>🏆 Достижения</h1>
          <p>Собирайте достижения, зарабатывайте очки и соревнуйтесь с другими пользователями</p>
        </div>
        
        {renderTabs()}
        
        <div className="achievements-content">
          {activeTab === 'all' && renderAllAchievements()}
          {activeTab === 'my' && renderMyAchievements()}
          {activeTab === 'progress' && renderProgress()}
          {activeTab === 'leaderboard' && renderLeaderboard()}
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;