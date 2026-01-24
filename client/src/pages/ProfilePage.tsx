// client/src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { levelsAPI, achievementsAPI, badgesAPI, questsAPI } from '../services/api';
import Header from '../components/Header';
import LevelProgress from '../components/LevelProgress';
import BadgeGrid from '../components/BadgeGrid';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [badges, setBadges] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [dailyQuests, setDailyQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'quests' | 'settings'>('overview');

  useEffect(() => {
    if (user) {
      loadUserData();
      updateStreak();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Загружаем прогресс уровня
      const progressResponse = await levelsAPI.getMyProgress();
      if (progressResponse.data.success) {
        setProgress(progressResponse.data.progress);
      }
      
      // Загружаем последние достижения
      const achievementsResponse = await achievementsAPI.getMy();
      if (achievementsResponse.data.success) {
        const unlocked = achievementsResponse.data.achievements
          .filter((ua: any) => ua.isUnlocked)
          .sort((a: any, b: any) => 
            new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
          )
          .slice(0, 5);
        setRecentAchievements(unlocked);
      }
      
      // Загружаем бейджи
      const badgesResponse = await badgesAPI.getMyBadges();
      if (badgesResponse.data.success) {
        setBadges(badgesResponse.data.badges);
      }
      
      // Загружаем серию
      const streakResponse = await badgesAPI.getStreak();
      if (streakResponse.data.success) {
        setStreak(streakResponse.data.streak);
      }
      
      // Загружаем ежедневные задания
      const questsResponse = await questsAPI.getMyQuests();
      if (questsResponse.data.success) {
        const daily = questsResponse.data.quests
          .filter((q: any) => q.quest.type === 'daily')
          .slice(0, 3);
        setDailyQuests(daily);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async () => {
    try {
      await badgesAPI.updateStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const handleBadgeClick = (badge: any) => {
    console.log('Badge clicked:', badge);
    // Можно открыть модальное окно с деталями бейджа
  };

  const renderOverview = () => (
    <>
      {/* Секция прогресса уровня */}
      {progress && (
        <div className="profile-section">
          <div className="section-header">
            <h3>⭐ Прогресс уровня</h3>
            <a href="/levels" className="view-all-link">
              Подробнее →
            </a>
          </div>
          <LevelProgress compact={true} />
        </div>
      )}
      
      {/* Секция серии */}
      {streak && (
        <div className="profile-section">
          <div className="section-header">
            <h3>🔥 Серия активности</h3>
            <div className="streak-info">
              <span className="streak-current">{streak.current} дней</span>
              <span className="streak-longest">Лучшее: {streak.longest} дней</span>
            </div>
          </div>
          <div className="streak-container">
            <div className="streak-visual">
              {Array.from({ length: 7 }).map((_, index) => (
                <div 
                  key={index}
                  className={`streak-day ${index < streak.current ? 'active' : 'inactive'}`}
                  title={`День ${index + 1}`}
                >
                  {index < streak.current ? '🔥' : '○'}
                </div>
              ))}
            </div>
            <p className="streak-description">
              Заходите каждый день, чтобы сохранить серию и получать бонусы!
            </p>
          </div>
        </div>
      )}
      
      {/* Секция отображаемых бейджей */}
      {badges && badges.displayed && badges.displayed.length > 0 && (
        <div className="profile-section">
          <div className="section-header">
            <h3>🏆 Мои бейджи</h3>
            <button 
              className="btn-outline"
              onClick={() => setActiveTab('badges')}
            >
              Управление →
            </button>
          </div>
          <div className="displayed-badges">
            {badges.displayed.map((badge: any) => (
              <div key={badge.achievementId} className="displayed-badge">
                <div 
                  className="badge-icon-large"
                  style={{
                    backgroundColor: `${badge.difficultyColor}20`,
                    borderColor: badge.difficultyColor
                  }}
                  title={`${badge.name} (${badge.points} очков)`}
                >
                  {badge.icon}
                </div>
                <div className="badge-tooltip">
                  <strong>{badge.name}</strong>
                  <span>{badge.points} очков</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Секция ежедневных заданий */}
      {dailyQuests.length > 0 && (
        <div className="profile-section">
          <div className="section-header">
            <h3>🎯 Ежедневные задания</h3>
            <button 
              className="btn-outline"
              onClick={() => setActiveTab('quests')}
            >
              Все задания →
            </button>
          </div>
          <div className="daily-quests">
            {dailyQuests.map((quest: any) => (
              <div key={quest._id} className="daily-quest">
                <div className="quest-icon">{quest.quest.icon}</div>
                <div className="quest-info">
                  <div className="quest-name">{quest.quest.name}</div>
                  <div className="quest-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{
                          width: `${(quest.progress / quest.requiredProgress) * 100}%`,
                          backgroundColor: quest.quest.difficultyColor
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {quest.progress}/{quest.requiredProgress}
                    </span>
                  </div>
                  {quest.isCompleted && !quest.claimed && (
                    <button className="claim-btn">
                      Получить {quest.quest.points} очков
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderBadgesTab = () => (
    <div className="profile-section">
      <div className="section-header">
        <h3>🏆 Моя коллекция бейджей</h3>
        <div className="badge-stats">
          <span className="stat-item">
            <strong>{badges?.stats?.total || 0}</strong> всего
          </span>
          <span className="stat-item">
            <strong>{badges?.stats?.displayedCount || 0}</strong> отображается
          </span>
        </div>
      </div>
      
      {badges ? (
        <>
          <div className="badge-collection-stats">
            <div className="stat-card">
              <h4>По сложности</h4>
              <div className="difficulty-stats">
                {Object.entries(badges.stats?.byDifficulty || {}).map(([difficulty, count]) => (
                  <div key={difficulty} className="difficulty-stat">
                    <span className="difficulty-label">{difficulty}</span>
                    <span className="difficulty-count">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="stat-card">
              <h4>По категориям</h4>
              <div className="category-stats">
                {Object.entries(badges.stats?.byCategory || {}).map(([category, count]) => (
                  <div key={category} className="category-stat">
                    <span className="category-label">{category}</span>
                    <span className="category-count">{(count as any[]).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <BadgeGrid
            badges={badges.all || []}
            title="Все бейджи"
            onBadgeClick={handleBadgeClick}
            editable={true}
          />
        </>
      ) : (
        <div className="loading">Загрузка бейджей...</div>
      )}
    </div>
  );

  const renderQuestsTab = () => (
    <div className="profile-section">
      <div className="section-header">
        <h3>🎯 Задания и квесты</h3>
        <button className="btn-primary" onClick={handleGenerateDailyQuests}>
          Новые задания
        </button>
      </div>
      {/* Здесь будет компонент квестов */}
      <div className="coming-soon">
        <p>Система заданий скоро будет доступна!</p>
      </div>
    </div>
  );

  const handleGenerateDailyQuests = async () => {
    try {
      await questsAPI.generateDaily();
      loadUserData();
    } catch (error) {
      console.error('Error generating daily quests:', error);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <Header />
        <div className="error">Пожалуйста, войдите в систему.</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header />
      <div className="profile-container">
        <div className="profile-header">
          <h1>Профиль пользователя</h1>
          <p>Управление вашей учетной записью</p>
        </div>
        
        {/* Вкладки профиля */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Обзор
          </button>
          <button
            className={`profile-tab ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            Бейджи
          </button>
          <button
            className={`profile-tab ${activeTab === 'quests' ? 'active' : ''}`}
            onClick={() => setActiveTab('quests')}
          >
            Задания
          </button>
          <button
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Настройки
          </button>
        </div>
        
        <div className="profile-content">
          {/* Основная информация профиля */}
          <div className="profile-card">
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="profile-details">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                
                <div className="profile-stats-quick">
                  {progress && (
                    <div className="stat-quick">
                      <div className="stat-icon">⭐</div>
                      <div className="stat-info">
                        <div className="stat-value">Уровень {progress.level}</div>
                        <div className="stat-label">{progress.experiencePoints} опыта</div>
                      </div>
                    </div>
                  )}
                  
                  {badges && (
                    <div className="stat-quick">
                      <div className="stat-icon">🏆</div>
                      <div className="stat-info">
                        <div className="stat-value">{badges.stats?.total || 0} бейджей</div>
                        <div className="stat-label">{badges.stats?.displayedCount || 0} отображается</div>
                      </div>
                    </div>
                  )}
                  
                  {streak && (
                    <div className="stat-quick">
                      <div className="stat-icon">🔥</div>
                      <div className="stat-info">
                        <div className="stat-value">Серия {streak.current} дней</div>
                        <div className="stat-label">Лучшее: {streak.longest} дней</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              <button className="btn-primary">Редактировать профиль</button>
              <button className="btn-outline">Сменить пароль</button>
            </div>
          </div>
          
          {/* Контент вкладок */}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'badges' && renderBadgesTab()}
          {activeTab === 'quests' && renderQuestsTab()}
          {activeTab === 'settings' && (
            <div className="profile-section">
              <h3>Настройки профиля</h3>
              <p>Скоро появится!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
