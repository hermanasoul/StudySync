import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { friendsAPI } from '../services/api';
import './FriendsList.css';

interface Friend {
  friendshipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string;
  level: number;
  experiencePoints: number;
  status: string;
  isRequester: boolean;
  createdAt: string;
  updatedAt: string;
}

const FriendsList: React.FC = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Friend[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadFriendsData();
    }
  }, [user]);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      
      // Загружаем друзей
      const friendsResponse = await friendsAPI.getFriends();
      if (friendsResponse.data.success) {
        setFriends(friendsResponse.data.data);
      }
      
      // Загружаем входящие запросы
      const incomingResponse = await friendsAPI.getIncomingRequests();
      if (incomingResponse.data.success) {
        setIncomingRequests(incomingResponse.data.data);
      }
      
      // Загружаем исходящие запросы
      const outgoingResponse = await friendsAPI.getOutgoingRequests();
      if (outgoingResponse.data.success) {
        setOutgoingRequests(outgoingResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await friendsAPI.acceptRequest(friendshipId);
      loadFriendsData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await friendsAPI.rejectRequest(friendshipId);
      loadFriendsData();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этого друга?')) {
      try {
        await friendsAPI.removeFriend(friendshipId);
        loadFriendsData();
      } catch (error) {
        console.error('Error removing friend:', error);
      }
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 50) return '#ffd700';
    if (level >= 30) return '#c0c0c0';
    if (level >= 20) return '#cd7f32';
    if (level >= 10) return '#8b5cf6';
    return '#3b82f6';
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return <div className="friends-list-container">Пожалуйста, войдите в систему.</div>;
  }

  return (
    <div className="friends-list-container">
      <div className="friends-header">
        <h2>Друзья</h2>
        <div className="friends-stats">
          <span className="stat">
            <strong>{friends.length}</strong> друзей
          </span>
          <span className="stat">
            <strong>{incomingRequests.length}</strong> входящих запросов
          </span>
          <span className="stat">
            <strong>{outgoingRequests.length}</strong> исходящих запросов
          </span>
        </div>
      </div>

      <div className="friends-tabs">
        <button
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Друзья ({friends.length})
        </button>
        <button
          className={`tab ${activeTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Входящие ({incomingRequests.length})
        </button>
        <button
          className={`tab ${activeTab === 'outgoing' ? 'active' : ''}`}
          onClick={() => setActiveTab('outgoing')}
        >
          Исходящие ({outgoingRequests.length})
        </button>
      </div>

      <div className="friends-content">
        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <>
            {activeTab === 'friends' && (
              <div className="friends-tab">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Поиск друзей..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                {filteredFriends.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h4>Пока нет друзей</h4>
                    <p>Добавьте друзей, чтобы видеть их прогресс и сравнивать результаты</p>
                  </div>
                ) : (
                  <div className="friends-grid">
                    {filteredFriends.map((friend) => (
                      <div key={friend.friendshipId} className="friend-card">
                        <div className="friend-avatar">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt={friend.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div 
                            className="level-badge"
                            style={{ backgroundColor: getLevelColor(friend.level) }}
                          >
                            {friend.level}
                          </div>
                        </div>
                        
                        <div className="friend-info">
                          <div className="friend-name">{friend.name}</div>
                          <div className="friend-email">{friend.email}</div>
                          
                          <div className="friend-stats">
                            <div className="stat-item">
                              <span className="stat-label">Уровень:</span>
                              <span className="stat-value">{friend.level}</span>
                            </div>
                            <div className="stat-item">
                              <span className="stat-label">Опыт:</span>
                              <span className="stat-value">{friend.experiencePoints.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="friend-actions">
                            <button 
                              className="btn-primary"
                              onClick={() => window.location.href = `/profile/${friend.userId}`}
                            >
                              Профиль
                            </button>
                            <button 
                              className="btn-outline"
                              onClick={() => handleRemoveFriend(friend.friendshipId)}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div className="incoming-tab">
                {incomingRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📨</div>
                    <h4>Нет входящих запросов</h4>
                    <p>Здесь будут отображаться запросы в друзья от других пользователей</p>
                  </div>
                ) : (
                  <div className="requests-list">
                    {incomingRequests.map((request) => (
                      <div key={request.friendshipId} className="request-card">
                        <div className="request-avatar">
                          {request.avatarUrl ? (
                            <img src={request.avatarUrl} alt={request.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {request.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        <div className="request-info">
                          <div className="request-name">{request.name}</div>
                          <div className="request-email">{request.email}</div>
                          <div className="request-meta">
                            Отправил(а) запрос {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        
                        <div className="request-actions">
                          <button 
                            className="btn-success"
                            onClick={() => handleAcceptRequest(request.friendshipId)}
                          >
                            Принять
                          </button>
                          <button 
                            className="btn-outline"
                            onClick={() => handleRejectRequest(request.friendshipId)}
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'outgoing' && (
              <div className="outgoing-tab">
                {outgoingRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📤</div>
                    <h4>Нет исходящих запросов</h4>
                    <p>Здесь будут отображаться отправленные вами запросы в друзья</p>
                  </div>
                ) : (
                  <div className="requests-list">
                    {outgoingRequests.map((request) => (
                      <div key={request.friendshipId} className="request-card">
                        <div className="request-avatar">
                          {request.avatarUrl ? (
                            <img src={request.avatarUrl} alt={request.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {request.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        <div className="request-info">
                          <div className="request-name">{request.name}</div>
                          <div className="request-email">{request.email}</div>
                          <div className="request-meta">
                            Отправлено {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        
                        <div className="request-status">
                          <span className="status-badge pending">Ожидает ответа</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsList;