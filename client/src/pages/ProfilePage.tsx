// client/src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { achievementsAPI, AchievementProgress } from '../services/api';
import Header from '../components/Header';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadAchievementData();
    }
  }, [user]);

  const loadAchievementData = async () => {
    try {
      setLoading(true);
      
      // Загружаем прогресс достижений
      const progressResponse = await achievementsAPI.getProgress();
      if (progressResponse.data.success) {
        setProgress(progressResponse.data.progress);
      }
      
      // Загружаем последние достижения
      const achievementsResponse = await achievementsAPI.getMy();
      if (achievementsResponse.data.success) {
        // Берем 3 последних разблокированных достижения
        const unlocked = achievementsResponse.data.achievements
          .filter((ua: any) => ua.isUnlocked)
          .sort((a: any, b: any) => 
            new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
          )
          .slice(0, 3);
        setRecentAchievements(unlocked);
      }
    } catch (error) {
      console.error('Error loading achievement data:', error);
    } finally {
      setLoading(false);
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

  const getOverallProgress = () => {
    if (!progress) return 0;
    return progress.total > 0 ? Math.round((progress.unlocked / progress.total) * 100) : 0;
  };

  return (
    <div className="profile-page">
      <Header />
      <div className="profile-container">
        <div className="profile-header">
          <h1>Профиль пользователя</h1>
          <p>Управление вашей учетной записью</p>
        </div>
        
        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="profile-details">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                {progress && (
                  <div className="achievement-summary">
                    <div className="achievement-badge">
                      🏆 {progress.unlocked} из {progress.total}
                    </div>
                    <div className="achievement-points">
                      ⭐ {progress.totalPoints} очков
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Предметов</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Групп</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Карточек</div>
              </div>
              {progress && (
                <div className="stat-item">
                  <div className="stat-number">{getOverallProgress()}%</div>
                  <div className="stat-label">Прогресс достижений</div>
                </div>
              )}
            </div>
            
            <div className="profile-actions">
              <button className="btn-primary">Редактировать профиль</button>
              <button className="btn-outline">Сменить пароль</button>
            </div>
          </div>
          
          {/* Секция достижений в профиле */}
          {progress && (
            <div className="profile-achievements">
              <div className="section-header">
                <h3>🏆 Мои достижения</h3>
                <a href="/achievements" className="view-all-link">
                  Посмотреть все →
                </a>
              </div>
              
              <div className="achievement-progress-summary">
                <div className="progress-overview">
                  <div className="progress-info">
                    <span className="progress-label">Общий прогресс</span>
                    <span className="progress-value">{getOverallProgress()}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${getOverallProgress()}%` }}
                    />
                  </div>
                </div>
                
                <div className="progress-stats">
                  <div className="progress-stat">
                    <div className="stat-value">{progress.unlocked}</div>
                    <div className="stat-label">Разблокировано</div>
                  </div>
                  <div className="progress-stat">
                    <div className="stat-value">{progress.total}</div>
                    <div className="stat-label">Всего</div>
                  </div>
                  <div className="progress-stat">
                    <div className="stat-value">{progress.totalPoints}</div>
                    <div className="stat-label">Очков</div>
                  </div>
                </div>
              </div>
              
              {recentAchievements.length > 0 && (
                <div className="recent-achievements">
                  <h4>Последние достижения</h4>
                  <div className="achievements-grid">
                    {recentAchievements.map((ua) => (
                      <div key={ua.id} className="recent-achievement">
                        <div className="achievement-icon-small">
                          {ua.achievement.icon}
                        </div>
                        <div className="achievement-info">
                          <div className="achievement-name">
                            {ua.achievement.name}
                          </div>
                          <div className="achievement-date">
                            {new Date(ua.unlockedAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="achievements-actions">
                <a href="/achievements" className="btn-primary full-width">
                  Открыть все достижения
                </a>
              </div>
            </div>
          )}
          
          <div className="coming-soon">
            <h3>Скоро появится</h3>
            <p>Управление уведомлениями, настройками темы и многое другое.</p>
            <ul>
              <li>Настройки уведомлений</li>
              <li>Изменение темы приложения</li>
              <li>Экспорт данных</li>
              <li>Подробная статистика обучения</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
