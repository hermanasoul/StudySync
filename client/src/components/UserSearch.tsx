import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { friendsAPI, followsAPI } from '../services/api';
import './UserSearch.css';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  level: number;
  experiencePoints: number;
  followerCount: number;
  followingCount: number;
  friendshipStatus: string | null;
  isRequester?: boolean;
}

const UserSearch: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'recommendations'>('search');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Дебаунс поискового запроса
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Поиск пользователей при изменении debouncedQuery
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchUsers();
    } else if (debouncedQuery.length === 0) {
      setUsers([]);
    }
  }, [debouncedQuery]);

  // Загрузка рекомендаций при загрузке компонента
  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const searchUsers = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    
    try {
      setLoading(true);
      const response = await friendsAPI.searchUsers(debouncedQuery);
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  const loadRecommendations = async () => {
    try {
      const response = await followsAPI.getRecommendations();
      if (response.data.success) {
        setRecommendations(response.data.data);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await friendsAPI.sendRequest(userId);
      
      // Обновляем статус в списке
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, friendshipStatus: 'pending', isRequester: true } : u
      ));
      
      setRecommendations(prev => prev.map(u => 
        u.id === userId ? { ...u, friendshipStatus: 'pending', isRequester: true } : u
      ));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleFollowUser = async (userId: string) => {
    try {
      await followsAPI.followUser(userId);
      
      // Обновляем статус в списке
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isFollowing: true } : u
      ));
      
      setRecommendations(prev => prev.map(u => 
        u.id === userId ? { ...u, isFollowing: true } : u
      ));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const getFriendRequestButton = (user: User) => {
    if (user.friendshipStatus === 'accepted') {
      return <span className="status-badge friend">Друг</span>;
    }
    
    if (user.friendshipStatus === 'pending') {
      if (user.isRequester) {
        return <span className="status-badge pending-outgoing">Запрос отправлен</span>;
      }
      return (
        <div className="request-buttons">
          <button className="btn-success">Принять</button>
          <button className="btn-outline">Отклонить</button>
        </div>
      );
    }
    
    return (
      <button 
        className="btn-primary"
        onClick={() => handleSendFriendRequest(user.id)}
      >
        Добавить в друзья
      </button>
    );
  };

  const getFollowButton = (user: User) => {
    if (user.id === user?.id) return null;
    
    return (
      <button 
        className="btn-outline"
        onClick={() => handleFollowUser(user.id)}
      >
        Подписаться
      </button>
    );
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return '#ffd700';
    if (level >= 30) return '#c0c0c0';
    if (level >= 20) return '#cd7f32';
    if (level >= 10) return '#8b5cf6';
    return '#3b82f6';
  };

  return (
    <div className="user-search-container">
      <div className="user-search-header">
        <h2>Поиск пользователей</h2>
        <div className="search-tabs">
          <button
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Поиск
          </button>
          <button
            className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            Рекомендации
          </button>
        </div>
      </div>

      {activeTab === 'search' && (
        <div className="search-section">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
          
          {loading && (
            <div className="loading">Поиск...</div>
          )}
          
          {!loading && searchQuery.length < 2 && searchQuery.length > 0 && (
            <div className="search-hint">
              Введите минимум 2 символа для поиска
            </div>
          )}
          
          {!loading && users.length > 0 && (
            <div className="search-results">
              <h3>Найдено пользователей: {users.length}</h3>
              <div className="users-grid">
                {users.map((user) => (
                  <div key={user.id} className="user-card">
                    <div className="user-header">
                      <div className="user-avatar">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div 
                          className="level-badge"
                          style={{ backgroundColor: getLevelColor(user.level) }}
                        >
                          {user.level}
                        </div>
                      </div>
                      
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                        
                        <div className="user-stats">
                          <div className="stat">
                            <span className="stat-label">Подписчики:</span>
                            <span className="stat-value">{user.followerCount}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Опыт:</span>
                            <span className="stat-value">{user.experiencePoints.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="user-actions">
                      {getFriendRequestButton(user)}
                      {getFollowButton(user)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!loading && users.length === 0 && searchQuery.length >= 2 && (
            <div className="empty-results">
              <div className="empty-icon">👤</div>
              <h4>Пользователи не найдены</h4>
              <p>Попробуйте изменить поисковый запрос</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="recommendations-section">
          <div className="section-header">
            <h3>Рекомендации для вас</h3>
            <button className="btn-outline" onClick={loadRecommendations}>
              Обновить
            </button>
          </div>
          
          {recommendations.length === 0 ? (
            <div className="empty-recommendations">
              <div className="empty-icon">🌟</div>
              <h4>Пока нет рекомендаций</h4>
              <p>Рекомендации появятся, когда система изучит ваши интересы</p>
            </div>
          ) : (
            <div className="recommendations-grid">
              {recommendations.map((user) => (
                <div key={user.id} className="recommendation-card">
                  <div className="recommendation-avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div 
                      className="level-badge"
                      style={{ backgroundColor: getLevelColor(user.level) }}
                    >
                      {user.level}
                    </div>
                  </div>
                  
                  <div className="recommendation-info">
                    <div className="recommendation-name">{user.name}</div>
                    <div className="recommendation-email">{user.email}</div>
                    
                    <div className="recommendation-stats">
                      <div className="stat">
                        <span className="stat-icon">👥</span>
                        <span>{user.followerCount} подписчиков</span>
                      </div>
                      <div className="stat">
                        <span className="stat-icon">⭐</span>
                        <span>Уровень {user.level}</span>
                      </div>
                    </div>
                    
                    <div className="recommendation-actions">
                      {getFriendRequestButton(user)}
                      {getFollowButton(user)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;