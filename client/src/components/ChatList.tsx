import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatsAPI } from '../services/api';
import './ChatList.css';

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  participants: Array<{
    userId: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
    lastRead: string;
  }>;
  lastMessage?: {
    content: string;
    senderId: {
      _id: string;
      name: string;
    };
    sentAt: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
  selectedChatId?: string;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedChatId }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await chatsAPI.getUserChats();
      if (response.data.success) {
        setChats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group' && chat.name) {
      return chat.name;
    }
    
    // Для личного чата показываем имя другого участника
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(
        p => p.userId._id !== user?.id
      );
      return otherParticipant?.userId.name || 'Чат';
    }
    
    return 'Безымянный чат';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      // Для групповых чатов показываем инициалы первого участника
      const firstParticipant = chat.participants.find(p => p.userId._id !== user?.id);
      return firstParticipant?.userId.name?.charAt(0)?.toUpperCase() || 'G';
    }
    
    // Для личных чатов показываем аватар другого участника
    const otherParticipant = chat.participants.find(
      p => p.userId._id !== user?.id
    );
    if (otherParticipant?.userId.avatarUrl) {
      return (
        <img 
          src={otherParticipant.userId.avatarUrl} 
          alt={otherParticipant.userId.name}
          className="chat-avatar-img"
        />
      );
    }
    
    return otherParticipant?.userId.name?.charAt(0)?.toUpperCase() || 'U';
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) {
      return 'Нет сообщений';
    }

    const isOwnMessage = chat.lastMessage.senderId._id === user?.id;
    const senderPrefix = isOwnMessage ? 'Вы: ' : '';
    
    return senderPrefix + (chat.lastMessage.content.length > 30 
      ? chat.lastMessage.content.substring(0, 30) + '...' 
      : chat.lastMessage.content
    );
  };

  const filteredChats = chats.filter(chat => {
    const chatName = getChatName(chat).toLowerCase();
    return chatName.includes(searchQuery.toLowerCase());
  });

  if (!user) {
    return <div className="chat-list-container">Пожалуйста, войдите в систему.</div>;
  }

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h3>Чаты</h3>
        <button className="new-chat-btn" title="Новый чат">
          +
        </button>
      </div>

      <div className="chat-search">
        <input
          type="text"
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-chats">Загрузка чатов...</div>
      ) : filteredChats.length === 0 ? (
        <div className="empty-chats">
          <div className="empty-icon">💬</div>
          <p>У вас пока нет чатов</p>
          <button className="btn-outline">Начать общение</button>
        </div>
      ) : (
        <div className="chats-list">
          {filteredChats.map((chat) => (
            <div
              key={chat._id}
              className={`chat-item ${selectedChatId === chat._id ? 'selected' : ''}`}
              onClick={() => onSelectChat(chat)}
            >
              <div className="chat-avatar">
                <div className="avatar-container">
                  {getChatAvatar(chat)}
                  {chat.unreadCount > 0 && (
                    <span className="unread-badge">{chat.unreadCount}</span>
                  )}
                </div>
              </div>

              <div className="chat-info">
                <div className="chat-header">
                  <div className="chat-name">{getChatName(chat)}</div>
                  {chat.lastMessage && (
                    <div className="chat-time">
                      {formatTime(chat.lastMessage.sentAt)}
                    </div>
                  )}
                </div>

                <div className="chat-preview">
                  <div className="last-message">
                    {getLastMessagePreview(chat)}
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="unread-indicator"></div>
                  )}
                </div>

                {chat.type === 'group' && (
                  <div className="chat-meta">
                    <span className="participant-count">
                      {chat.participants.length} участников
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;