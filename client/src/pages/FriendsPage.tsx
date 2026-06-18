import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { friendsAPI } from '../services/api';
import './FriendsPage.css';
import '../App.css';

interface Friend {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  level?: number;
  friendshipId?: string;
}

interface FriendRequest {
  _id: string;
  requester: Friend;
  recipient: Friend;
  status: string;
  createdAt: string;
}

interface FriendStats {
  totalFriends: number;
  incomingRequests: number;
  outgoingRequests: number;
}

const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [stats, setStats] = useState<FriendStats>({
    totalFriends: 0,
    incomingRequests: 0,
    outgoingRequests: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [error, setError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState<Record<string, boolean>>({});
  const [searchLoading, setSearchLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [friendsRes, incomingRes, outgoingRes, statsRes] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getIncomingRequests(),
        friendsAPI.getOutgoingRequests(),
        friendsAPI.getFriendsStats(),
      ]);

      if (friendsRes.data.success) {
        const unique = friendsRes.data.friends.filter(
          (friend: Friend, index: number, self: Friend[]) =>
            index === self.findIndex(f => f._id === friend._id)
        );
        setFriends(unique);
      } else {
        setError('Не удалось загрузить друзей');
      }

      if (incomingRes.data.success) setIncoming(incomingRes.data.requests);
      else setError(prev => prev || 'Не удалось загрузить входящие заявки');

      if (outgoingRes.data.success) setOutgoing(outgoingRes.data.requests);
      else setError(prev => prev || 'Не удалось загрузить исходящие заявки');

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка загрузки данных друзей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Загрузка всех пользователей при активации вкладки "Поиск"
  const loadAllUsers = useCallback(async () => {
    setSearchLoading(true);
    try {
      const res = await friendsAPI.searchUsers('', { limit: 20, excludeFriends: true });
      if (res.data.success) {
        setSearchResults(res.data.users);
      } else {
        setError('Не удалось загрузить пользователей');
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка загрузки пользователей');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // При смене вкладки на "поиск" – загружаем всех пользователей
  useEffect(() => {
    if (activeTab === 'search') {
      loadAllUsers();
    }
  }, [activeTab, loadAllUsers]);

  // Поиск с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'search') {
        handleSearch();
      }
    }, 300); // 300ms задержка

    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (searchLoading) return;
    setSearchLoading(true);
    try {
      const res = await friendsAPI.searchUsers(searchQuery, { limit: 20, excludeFriends: true });
      if (res.data.success) {
        setSearchResults(res.data.users);
      } else {
        setError('Пользователи не найдены');
      }
    } catch (err) {
      setError('Ошибка поиска');
    } finally {
      setSearchLoading(false);
    }
  };

  const setLoadingState = (id: string, loading: boolean) => {
    setRequestLoading(prev => ({ ...prev, [id]: loading }));
  };

  const handleSendRequest = async (userId: string) => {
    if (requestLoading[userId]) return;
    setLoadingState(userId, true);
    try {
      await friendsAPI.sendRequest(userId);
      // Обновляем список после отправки
      setSearchResults(prev => prev.filter(u => u._id !== userId));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка отправки');
    } finally {
      setLoadingState(userId, false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    setLoadingState(friendshipId, true);
    try {
      await friendsAPI.acceptRequest(friendshipId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка принятия');
    } finally {
      setLoadingState(friendshipId, false);
    }
  };

  const handleReject = async (friendshipId: string) => {
    setLoadingState(friendshipId, true);
    try {
      await friendsAPI.rejectRequest(friendshipId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка отклонения');
    } finally {
      setLoadingState(friendshipId, false);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!window.confirm('Удалить друга?')) return;
    setLoadingState(friendshipId, true);
    try {
      await friendsAPI.removeFriend(friendshipId);
      setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления');
    } finally {
      setLoadingState(friendshipId, false);
    }
  };

  if (loading) {
    return (
      <div className="friends-page">
        <Header />
        <div className="page-with-header">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <Header />
      <div className="page-with-header">
        <div className="friends-container">
          <div className="page-header">
            <h1>Друзья</h1>
            <p>Ваши друзья, заявки и поиск</p>
          </div>
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="error-close">×</button>
            </div>
          )}

          <div className="friends-tabs">
            <button
              className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Друзья ({friends.length})
            </button>
            <button
              className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Заявки ({incoming.length})
            </button>
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Поиск
            </button>
          </div>

          <div className="friends-content">
            <div className="friends-main">
              {activeTab === 'friends' && (
                <div className="tab-panel friends-list-panel">
                  {friends.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <h3>У вас пока нет друзей</h3>
                      <p>Найдите друзей через поиск или примите входящие заявки</p>
                    </div>
                  ) : (
                    friends.map(friend => (
                      <div key={friend._id} className="friend-card">
                        <div className="friend-info">
                          <div className="friend-avatar">
                            {friend.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="friend-details">
                            <div className="friend-name">{friend.name}</div>
                            <div className="friend-email">{friend.email}</div>
                            {friend.level && (
                              <span className="friend-level">Уровень {friend.level}</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-danger btn-sm"  // Добавлен btn-sm
                          disabled={!!requestLoading[friend.friendshipId || friend._id]}
                          onClick={() => handleRemoveFriend(friend.friendshipId || friend._id)}
                        >
                          Удалить
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="tab-panel requests-panel">
                  <h3 className="subsection-title">Входящие заявки</h3>
                  {incoming.length === 0 ? (
                    <p className="empty-message">Нет входящих заявок.</p>
                  ) : (
                    incoming.map(request => (
                      <div key={request._id} className="request-card">
                        <div className="friend-info">
                          <div className="friend-avatar">
                            {request.requester?.name?.charAt(0) || '?'}
                          </div>
                          <div className="friend-details">
                            <div className="friend-name">{request.requester?.name}</div>
                            <div className="friend-email">{request.requester?.email}</div>
                          </div>
                        </div>
                        <div className="request-actions">
                          <button
                            className="btn btn-success btn-sm"
                            disabled={!!requestLoading[request._id]}
                            onClick={() => handleAccept(request._id)}
                          >
                            Принять
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={!!requestLoading[request._id]}
                            onClick={() => handleReject(request._id)}
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  <h3 className="subsection-title">Исходящие заявки</h3>
                  {outgoing.length === 0 ? (
                    <p className="empty-message">Нет исходящих заявок.</p>
                  ) : (
                    outgoing.map(request => (
                      <div key={request._id} className="request-card">
                        <div className="friend-info">
                          <div className="friend-avatar">
                            {request.recipient?.name?.charAt(0) || '?'}
                          </div>
                          <div className="friend-details">
                            <div className="friend-name">{request.recipient?.name}</div>
                            <div className="friend-email">{request.recipient?.email}</div>
                          </div>
                        </div>
                        <span className="pending-badge">Ожидание</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'search' && (
                <div className="tab-panel search-panel">
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="Поиск пользователей..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={searchLoading}>
                      {searchLoading ? 'Поиск...' : 'Найти'}
                    </button>
                  </div>
                  <div className="search-results">
                    {searchLoading ? (
                      <p>Загрузка...</p>
                    ) : (
                      <>
                        {searchResults.length === 0 ? (
                          <p className="empty-message">Пользователи не найдены</p>
                        ) : (
                          searchResults.map(user => (
                            <div key={user._id} className="user-card">
                              <div className="friend-info">
                                <div className="friend-avatar">
                                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="friend-details">
                                  <div className="friend-name">{user.name}</div>
                                  <div className="friend-email">{user.email}</div>
                                </div>
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!!requestLoading[user._id]}
                                onClick={() => handleSendRequest(user._id)}
                              >
                                Добавить
                              </button>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <aside className="friends-sidebar">
              <div className="sidebar-card stats-card">
                <h3>📊 Статистика</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{stats.totalFriends}</span>
                    <span className="stat-label">Друзей</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.incomingRequests}</span>
                    <span className="stat-label">Входящих</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.outgoingRequests}</span>
                    <span className="stat-label">Исходящих</span>
                  </div>
                </div>
              </div>
              <div className="sidebar-card tips-card">
                <h3>💡 Советы</h3>
                <ul className="tips-list">
                  <li>Добавляйте друзей для совместных занятий</li>
                  <li>Следите за входящими заявками</li>
                  <li>Используйте поиск по email или имени</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;