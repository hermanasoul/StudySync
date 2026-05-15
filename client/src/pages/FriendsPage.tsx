// client/src/pages/FriendsPage.tsx

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

const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [error, setError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getIncomingRequests(),
        friendsAPI.getOutgoingRequests()
      ]);

      if (friendsRes.data.success) {
        // Фильтрация дубликатов на клиенте
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await friendsAPI.searchUsers(searchQuery, { limit: 10 });
      if (res.data.success) setSearchResults(res.data.users);
      else setError('Пользователи не найдены');
    } catch (err) {
      setError('Ошибка поиска');
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
      alert('Заявка отправлена');
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
            <button className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Друзья ({friends.length})</button>
            <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Заявки ({incoming.length})</button>
            <button className={`tab ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>Поиск</button>
          </div>

          {activeTab === 'friends' && (
            <div className="friends-list">
              {friends.length === 0 ? (
                <p>У вас пока нет друзей.</p>
              ) : (
                friends.map(friend => (
                  <div key={friend._id} className="friend-card">
                    <div className="friend-info">
                      <div className="friend-avatar">{friend.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div>
                        <div className="friend-name">{friend.name}</div>
                        <div className="friend-email">{friend.email}</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-danger"
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
            <div>
              <h3>Входящие заявки</h3>
              {incoming.length === 0 ? (
                <p>Нет входящих заявок.</p>
              ) : (
                incoming.map(request => (
                  <div key={request._id} className="request-card">
                    <div className="friend-info">
                      <div className="friend-avatar">{request.requester?.name?.charAt(0) || '?'}</div>
                      <div>
                        <div className="friend-name">{request.requester?.name}</div>
                        <div className="friend-email">{request.requester?.email}</div>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button className="btn btn-success" disabled={!!requestLoading[request._id]} onClick={() => handleAccept(request._id)}>Принять</button>
                      <button className="btn btn-outline" disabled={!!requestLoading[request._id]} onClick={() => handleReject(request._id)}>Отклонить</button>
                    </div>
                  </div>
                ))
              )}
              <h3>Исходящие заявки</h3>
              {outgoing.length === 0 ? (
                <p>Нет исходящих заявок.</p>
              ) : (
                outgoing.map(request => (
                  <div key={request._id} className="request-card">
                    <div className="friend-info">
                      <div className="friend-avatar">{request.recipient?.name?.charAt(0) || '?'}</div>
                      <div>
                        <div className="friend-name">{request.recipient?.name}</div>
                        <div className="friend-email">{request.recipient?.email}</div>
                      </div>
                    </div>
                    <span className="pending">Ожидание</span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="search-section">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn btn-primary" onClick={handleSearch}>Найти</button>
              </div>
              <div className="search-results">
                {searchResults.map(user => (
                  <div key={user._id} className="user-card">
                    <div className="friend-info">
                      <div className="friend-avatar">{user.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div>
                        <div className="friend-name">{user.name}</div>
                        <div className="friend-email">{user.email}</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      disabled={!!requestLoading[user._id]}
                      onClick={() => handleSendRequest(user._id)}
                    >
                      Добавить
                    </button>
                  </div>
                ))}
                {searchResults.length === 0 && searchQuery && (
                  <p>Пользователи не найдены.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;