// client/src/pages/ChatsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import { chatsAPI, friendsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import webSocketService from '../services/websocket';
import './ChatsPage.css';

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Array<{ _id: string; name: string; avatarUrl?: string }>;
  lastMessage?: any;
  unreadCount: number;
}

interface Friend {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const ChatsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChatFriend, setNewChatFriend] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await chatsAPI.getUserChats();
      if (res.data.success) {
        const raw: Chat[] = res.data.data || [];
        const unique = raw.filter((c, i, a) => a.findIndex(x => x._id === c._id) === i);
        setChats(unique);
      }
    } catch (e) {
      console.error(e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await friendsAPI.getFriends();
      if (res.data.success) {
        const real = (res.data.friends as Friend[]).filter(f => f._id !== user.id);
        setFriends(real);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChats();
    loadFriends();
  }, [loadChats, loadFriends]);

  // WebSocket-подписки для мгновенного обновления превью
  useEffect(() => {
    const handleChatUpdated = (updatedChat: Chat) => {
      setChats(prev => prev.map(chat => (chat._id === updatedChat._id ? updatedChat : chat)));
    };

    const handleNewMessage = (msg: any) => {
      setChats(prev =>
        prev.map(chat =>
          chat._id === msg.chat
            ? { ...chat, lastMessage: msg, updatedAt: new Date().toISOString() }
            : chat
        )
      );
    };

    webSocketService.on('chat_updated', handleChatUpdated);
    webSocketService.on('new_message', handleNewMessage);

    return () => {
      webSocketService.off('chat_updated', handleChatUpdated);
      webSocketService.off('new_message', handleNewMessage);
    };
  }, []);

  const createChat = async () => {
    setError(null);
    if (!newChatFriend) { setError('Выберите друга'); return; }
    if (newChatFriend === user?.id) { setError('Нельзя создать чат с самим собой'); return; }
    setCreating(true);
    try {
      const res = await chatsAPI.createChat({ type: 'direct', participantIds: [newChatFriend] });
      if (res.data.success && res.data.chat) {
        await loadChats();
        setSelectedChatId(res.data.chat._id);
        setShowCreateForm(false);
        setNewChatFriend('');
      } else {
        setError('Не удалось создать чат');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  const getFriendName = (id: string) => {
    const f = friends.find(x => x._id === id);
    return f ? `${f.name} (${f.email})` : '';
  };

  return (
    <div className="chats-page">
      <Header />
      <div className="page-with-header">
        <div className="chats-container">
          <div className="chats-sidebar">
            <div className="chats-sidebar-header">
              <h3>Чаты</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? '– Скрыть' : '+ Новый чат'}
              </button>
            </div>
            {showCreateForm && (
              <div className="create-chat-form">
                <div className="form-group">
                  <label className="form-label">Выберите друга</label>
                  <select value={newChatFriend} onChange={e => setNewChatFriend(e.target.value)} disabled={friends.length === 0}>
                    <option value="">— Выберите —</option>
                    {friends.map(f => (
                      <option key={f._id} value={f._id}>{f.name} ({f.email})</option>
                    ))}
                  </select>
                  {newChatFriend && <div className="selected-friend">Выбран: {getFriendName(newChatFriend)}</div>}
                  {friends.length === 0 && <div className="info-message">Нет друзей. <a href="/friends">Добавить</a></div>}
                </div>
                <div className="form-actions">
                  <button className="btn btn-success btn-sm" onClick={createChat} disabled={creating || !newChatFriend}>Создать чат</button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setShowCreateForm(false); setError(null); setNewChatFriend(''); }}>Отмена</button>
                </div>
                {error && <div className="error-message">{error}</div>}
              </div>
            )}
            <ChatList chats={chats} loading={loading} onSelectChat={setSelectedChatId} activeChatId={selectedChatId || undefined} />
          </div>
          <div className="chats-main">
            {selectedChatId ? (
              <ChatWindow
                chatId={selectedChatId}
                onClose={() => setSelectedChatId(null)}
                onChatsChanged={loadChats}
              />
            ) : (
              <div className="no-chat-selected"><p>Выберите чат или создайте новый</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatsPage;