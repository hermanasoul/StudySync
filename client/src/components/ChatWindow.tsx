import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import MessageBubble from './MessageBubble';
import './ChatWindow.css';

interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  replyTo?: Message;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  sentAt: string;
}

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Array<{
    userId: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
  }>;
  unreadCount: number;
}

interface ChatWindowProps {
  chat: Chat;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (chat) {
      loadMessages();
      joinChatRoom();
      markAsRead();
    }

    return () => {
      leaveChatRoom();
    };
  }, [chat._id]);

  useEffect(() => {
    // Подписываемся на события WebSocket
    const handleNewMessage = (data: any) => {
      if (data.chatId === chat._id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    };

    const handleMessageEdited = (data: any) => {
      if (data.chatId === chat._id) {
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, content: data.content, isEdited: true, editedAt: data.editedAt }
            : msg
        ));
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (data.chatId === chat._id) {
        setMessages(prev => prev.map(msg =>
          msg._id === data.messageId
            ? { ...msg, isDeleted: true, content: 'Сообщение удалено' }
            : msg
        ));
      }
    };

    const handleUserTyping = (data: any) => {
      if (data.chatId === chat._id && data.userId !== user?.id) {
        setOtherTyping(data.userName);
        setTimeout(() => setOtherTyping(null), 3000);
      }
    };

    const handleMessagesRead = (data: any) => {
      if (data.chatId === chat._id && data.userId !== user?.id) {
        // Обновляем статус прочтения сообщений
        setMessages(prev => prev.map(msg => ({
          ...msg,
          readBy: msg.readBy.some(r => r.userId === data.userId)
            ? msg.readBy
            : [...msg.readBy, { userId: data.userId, readAt: data.readAt }]
        })));
      }
    };

    webSocketService.on('chat:new_message', handleNewMessage);
    webSocketService.on('chat:message_edited', handleMessageEdited);
    webSocketService.on('chat:message_deleted', handleMessageDeleted);
    webSocketService.on('chat:user_typing', handleUserTyping);
    webSocketService.on('chat:messages_read', handleMessagesRead);

    return () => {
      webSocketService.off('chat:new_message', handleNewMessage);
      webSocketService.off('chat:message_edited', handleMessageEdited);
      webSocketService.off('chat:message_deleted', handleMessageDeleted);
      webSocketService.off('chat:user_typing', handleUserTyping);
      webSocketService.off('chat:messages_read', handleMessagesRead);
    };
  }, [chat._id, user?.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await chatsAPI.getChatMessages(chat._id, { limit: 50 });
      if (response.data.success) {
        setMessages(response.data.data);
        setHasMore(response.data.data.length === 50);
      }
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    try {
      setLoadingMore(true);
      const oldestMessage = messages[0];
      const response = await chatsAPI.getChatMessages(chat._id, {
        limit: 50,
        before: oldestMessage.sentAt
      });

      if (response.data.success && response.data.data.length > 0) {
        setMessages(prev => [...response.data.data, ...prev]);
        setHasMore(response.data.data.length === 50);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const joinChatRoom = () => {
    webSocketService.send('chat:join', chat._id);
  };

  const leaveChatRoom = () => {
    webSocketService.send('chat:leave', chat._id);
  };

  const markAsRead = async () => {
    try {
      await chatsAPI.markChatAsRead(chat._id);
      
      // Отправляем WebSocket событие о прочтении
      const unreadMessageIds = messages
        .filter(msg => 
          msg.senderId._id !== user?.id && 
          !msg.readBy.some(r => r.userId === user?.id)
        )
        .map(msg => msg._id);

      if (unreadMessageIds.length > 0) {
        webSocketService.send('chat:mark_read', {
          chatId: chat._id,
          messageIds: unreadMessageIds
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Отправляем через WebSocket для мгновенной доставки
      webSocketService.send('chat:send_message', {
        chatId: chat._id,
        content: messageContent
      });

      // Также отправляем через REST API для надежности
      await chatsAPI.sendMessage(chat._id, { content: messageContent });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      webSocketService.send('chat:typing', {
        chatId: chat._id,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      webSocketService.send('chat:typing', {
        chatId: chat._id,
        isTyping: false
      });
    }, 1000);
  }, [chat._id, isTyping]);

  const getChatName = () => {
    if (chat.type === 'group' && chat.name) {
      return chat.name;
    }
    
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(
        p => p.userId._id !== user?.id
      );
      return otherParticipant?.userId.name || 'Чат';
    }
    
    return 'Безымянный чат';
  };

  const getChatAvatar = () => {
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(
        p => p.userId._id !== user?.id
      );
      if (otherParticipant?.userId.avatarUrl) {
        return (
          <img 
            src={otherParticipant.userId.avatarUrl} 
            alt={otherParticipant.userId.name}
            className="chat-header-avatar-img"
          />
        );
      }
      return otherParticipant?.userId.name?.charAt(0)?.toUpperCase() || 'U';
    }
    
    return 'G';
  };

  if (!user) {
    return <div className="chat-window">Пожалуйста, войдите в систему.</div>;
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {getChatAvatar()}
          </div>
          <div className="chat-header-details">
            <div className="chat-title">{getChatName()}</div>
            <div className="chat-status">
              {otherTyping ? (
                <span className="typing-indicator">{otherTyping} печатает...</span>
              ) : (
                <span>{chat.participants.length} участников</span>
              )}
            </div>
          </div>
        </div>
        <button className="close-chat-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div 
        className="messages-container"
        ref={messagesContainerRef}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (target.scrollTop === 0 && hasMore && !loadingMore) {
            loadMoreMessages();
          }
        }}
      >
        {loadingMore && (
          <div className="loading-more">
            <div className="spinner"></div>
          </div>
        )}

        {loading ? (
          <div className="loading-messages">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="empty-messages">
            <div className="empty-icon">💬</div>
            <p>Начните общение</p>
            <p className="empty-hint">Отправьте первое сообщение в этом чате</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const showDate = !prevMessage || 
                new Date(message.sentAt).toDateString() !== 
                new Date(prevMessage.sentAt).toDateString();

              const showAvatar = !prevMessage || 
                prevMessage.senderId._id !== message.senderId._id ||
                new Date(message.sentAt).getTime() - 
                new Date(prevMessage.sentAt).getTime() > 5 * 60 * 1000;

              return (
                <React.Fragment key={message._id}>
                  {showDate && (
                    <div className="message-date">
                      {new Date(message.sentAt).toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={message.senderId._id === user.id}
                    showAvatar={showAvatar}
                    showTime={true}
                  />
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          placeholder="Введите сообщение..."
          className="message-input"
          maxLength={5000}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim()}
        >
          <span className="send-icon">↗</span>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;