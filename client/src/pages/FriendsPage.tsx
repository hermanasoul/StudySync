import React, { useState } from 'react';
import Header from '../components/Header';
import FriendsList from '../components/FriendsList';
import UserSearch from '../components/UserSearch';
import Leaderboard from '../components/Leaderboard';
import { useAuth } from '../context/AuthContext';
import './FriendsPage.css';

const FriendsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'leaderboard'>('friends');

  if (!user) {
    return (
      <div className="friends-page">
        <Header />
        <div className="error">Пожалуйста, войдите в систему.</div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <Header />
      <div className="page-with-header">
        <div className="friends-container">
          <div className="friends-header-section">
            <h1>Социальные функции</h1>
            <p>Общайтесь, сравнивайте прогресс и соревнуйтесь с друзьями</p>
          </div>

          <div className="friends-tabs-navigation">
            <button
              className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              👥 Мои друзья
            </button>
            <button
              className={`friends-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 Поиск пользователей
            </button>
            <button
              className={`friends-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              🏆 Лидерборды
            </button>
          </div>

          <div className="friends-content-area">
            {activeTab === 'friends' && (
              <div className="friends-tab-content">
                <FriendsList />
                
                <div className="friends-sidebar">
                  <div className="sidebar-section">
                    <h3>💡 Советы</h3>
                    <ul className="tips-list">
                      <li>Добавляйте друзей для совместного обучения</li>
                      <li>Сравнивайте прогресс и мотивируйте друг друга</li>
                      <li>Создавайте учебные группы с друзьями</li>
                      <li>Получайте уведомления об успехах друзей</li>
                    </ul>
                  </div>
                  
                  <div className="sidebar-section">
                    <h3>🎯 Быстрые действия</h3>
                    <div className="quick-actions">
                      <button className="btn-primary" onClick={() => setActiveTab('search')}>
                        Найти друзей
                      </button>
                      <button className="btn-outline">
                        Пригласить по email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="search-tab-content">
                <UserSearch />
                
                <div className="search-sidebar">
                  <div className="sidebar-section">
                    <h3>📊 Статистика</h3>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                          <div className="stat-value">150+</div>
                          <div className="stat-label">Активных пользователей</div>
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-icon">🎓</div>
                        <div className="stat-info">
                          <div className="stat-value">50+</div>
                          <div className="stat-label">Учебных групп</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="leaderboard-tab-content">
                <div className="leaderboard-main">
                  <Leaderboard />
                </div>
                
                <div className="leaderboard-sidebar">
                  <div className="sidebar-section">
                    <h3>📈 Типы лидербордов</h3>
                    <div className="leaderboard-types">
                      <div className="type-item">
                        <div className="type-icon">🌍</div>
                        <div className="type-info">
                          <div className="type-name">Глобальный</div>
                          <div className="type-desc">Сравнение со всеми пользователями</div>
                        </div>
                      </div>
                      <div className="type-item">
                        <div className="type-icon">👥</div>
                        <div className="type-info">
                          <div className="type-name">Групповой</div>
                          <div className="type-desc">Только участники вашей группы</div>
                        </div>
                      </div>
                      <div className="type-item">
                        <div className="type-icon">📚</div>
                        <div className="type-info">
                          <div className="type-name">По предметам</div>
                          <div className="type-desc">Рейтинг по конкретному предмету</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="sidebar-section">
                    <h3>🏅 Как подняться в рейтинге</h3>
                    <ul className="ranking-tips">
                      <li>✅ Завершайте задания ежедневно</li>
                      <li>✅ Участвуйте в группах</li>
                      <li>✅ Создавайте карточки и заметки</li>
                      <li>✅ Получайте достижения</li>
                      <li>✅ Поддерживайте серию активности</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;