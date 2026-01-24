import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './ChatNotification.css';

const ChatNotification: React.FC = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      setupWebSocketListeners();
    }

    return () => {
      cleanupWebSocketListeners();
    };
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const response = await chatsAPI.getUserChats({ limit: 50 });
      if (response.data.success) {
        const totalUnread = response.data.data.reduce(
          (sum: number, chat: any) => sum + (chat.unreadCount || 0), 0
        );
        setUnreadCount(totalUnread);
        setRecentChats(response.data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const setupWebSocketListeners = () => {
    const handleNewMessage = (data: any) => {
      setUnreadCount(prev => prev + 1);
      
      // Обновляем список чатов
      setRecentChats(prev => {
        const updatedChats = [...prev];
        const chatIndex = updatedChats.findIndex(chat => chat._id === data.chatId);
        
        if (chatIndex !== -1) {
          // Обновляем существующий чат
          const chat = updatedChats[chatIndex];
          updatedChats.splice(chatIndex, 1);
          updatedChats.unshift({
            ...chat,
            lastMessage: data.message,
            unreadCount: (chat.unreadCount || 0) + 1,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Добавляем новый чат (загрузим детали позже)
          updatedChats.unshift({
            _id: data.chatId,
            lastMessage: data.message,
            unreadCount: 1,
            updatedAt: new Date().toISOString()
          });
          
          // Ограничиваем до 5 чатов
          if (updatedChats.length > 5) {
            updatedChats.pop();
          }
        }
        
        return updatedChats;
      });
    };

    webSocketService.on('chat:new_message', handleNewMessage);

    return () => {
      webSocketService.off('chat:new_message', handleNewMessage);
    };
  };

  const cleanupWebSocketListeners = () => {
    // Очистка будет выполнена в setupWebSocketListeners
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Помечаем все чаты как прочитанные
      await Promise.all(
        recentChats
          .filter(chat => chat.unreadCount > 0)
          .map(chat => chatsAPI.markChatAsRead(chat._id))
      );
      
      setUnreadCount(0);
      setRecentChats(prev => prev.map(chat => ({ ...chat, unreadCount: 0 })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getChatPreview = (chat: any) => {
    if (chat.lastMessage?.content) {
      return chat.lastMessage.content.length > 30
        ? chat.lastMessage.content.substring(0, 30) + '...'
        : chat.lastMessage.content;
    }
    return 'Нет сообщений';
  };

  const getChatName = (chat: any) => {
    if (chat.name) return chat.name;
    
    // Для личных чатов пытаемся получить имя участника
    if (chat.participants && chat.participants.length > 0) {
      const otherParticipant = chat.participants.find(
        (p: any) => p.userId._id !== user?.id
      );
      return otherParticipant?.userId.name || 'Чат';
    }
    
    return 'Загрузка...';
  };

  if (!user) return null;

  return (
    <div className="chat-notification">
      <button 
        className="notification-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="notification-icon">💬</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="dropdown-overlay"
            onClick={() => setShowDropdown(false)}
          />
          <div className="notification-dropdown">
            <div className="dropdown-header">
              <h4>Сообщения</h4>
              {unreadCount > 0 && (
                <button 
                  className="mark-read-btn"
                  onClick={handleMarkAllAsRead}
                >
                  Прочитать все
                </button>
              )}
            </div>

            <div className="chats-list">
              {recentChats.length === 0 ? (
                <div className="empty-chats">
                  <div className="empty-icon">💬</div>
                  <p>Нет сообщений</p>
                </div>
              ) : (
                recentChats.map((chat) => (
                  <a 
                    key={chat._id}
                    href={`/chats?chat=${chat._id}`}
                    className="chat-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    <div className="chat-avatar">
                      {chat.unreadCount > 0 && (
                        <span className="unread-dot"></span>
                      )}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{getChatName(chat)}</div>
                      <div className="chat-preview">{getChatPreview(chat)}</div>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="chat-unread">{chat.unreadCount}</div>
                    )}
                  </a>
                ))
              )}
            </div>

            <div className="dropdown-footer">
              <a href="/chats" className="view-all-btn">
                Все сообщения →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatNotification;