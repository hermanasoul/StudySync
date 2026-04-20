// client\src\components\ChatWindow.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import webSocketService from '../services/websocket';
import { chatsAPI } from '../services/api';
import './ChatWindow.css';

interface Message {
  _id: string;
  chatId: string;
  userId: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Array<{
    _id: string;
    name: string;
    avatarUrl?: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatWindowProps {
  chat: Chat | null;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = useCallback(async () => {
    if (!chat) return;
    try {
      setLoading(true);
      const response = await chatsAPI.getChatMessages(chat._id, { limit: 50 });
      if (response.data.success) {
        setMessages(response.data.messages.reverse());
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chat]);

  const joinChatRoom = useCallback(() => {
    if (!chat) return;
    webSocketService.send('join_chat', { chatId: chat._id });
  }, [chat]);

  const leaveChatRoom = useCallback(() => {
    if (!chat) return;
    webSocketService.send('leave_chat', { chatId: chat._id });
  }, [chat]);

  const markAsRead = useCallback(async () => {
    if (!chat) return;
    try {
      await chatsAPI.markChatAsRead(chat._id);
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }, [chat]);

  useEffect(() => {
    if (chat) {
      loadMessages();
      joinChatRoom();
      markAsRead();
    }
    return () => {
      if (chat) {
        leaveChatRoom();
      }
    };
  }, [chat, loadMessages, joinChatRoom, leaveChatRoom, markAsRead]);

  useEffect(() => {
    const handleNewMessage = (data: any) => {
      if (data.chatId === chat?._id) {
        setMessages(prev => [...prev, data.message]);
        markAsRead();
      }
    };

    const handleTyping = (data: any) => {
      if (data.chatId === chat?._id && data.userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    };

    webSocketService.on('new_message', handleNewMessage);
    webSocketService.on('typing', handleTyping);

    return () => {
      webSocketService.off('new_message', handleNewMessage);
      webSocketService.off('typing', handleTyping);
    };
  }, [chat, user?.id, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat) return;
    webSocketService.send('send_message', {
      chatId: chat._id,
      content: newMessage.trim()
    });
    setNewMessage('');
  };

  const handleTyping = () => {
    if (!chat) return;
    webSocketService.send('typing', { chatId: chat._id, isTyping: true });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      webSocketService.send('typing', { chatId: chat._id, isTyping: false });
    }, 1000);
  };

  const getOtherParticipant = () => {
    if (!chat || chat.type !== 'direct') return null;
    return chat.participants.find(p => p._id !== user?.id);
  };

  const getChatName = () => {
    if (!chat) return '';
    if (chat.type === 'direct') {
      const other = getOtherParticipant();
      return other?.name || 'Чат';
    }
    return chat.name || 'Групповой чат';
  };

  if (!chat) return null;

  const otherParticipant = getOtherParticipant();
  const typingArray = Array.from(typingUsers);
  const typingText = typingArray.length === 1 
    ? `${chat.participants.find(p => p._id === typingArray[0])?.name} печатает...`
    : typingArray.length > 1 
    ? 'Несколько человек печатают...'
    : '';

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>{getChatName()}</h3>
          {chat.type === 'direct' && otherParticipant && (
            <span className="user-status">● В сети</span>
          )}
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="chat-messages" ref={messagesContainerRef}>
        {loading ? (
          <div className="loading">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">Нет сообщений. Начните общение!</div>
        ) : (
          messages.map(msg => (
            <div
              key={msg._id}
              className={`message ${msg.userId._id === user?.id ? 'own' : ''}`}
            >
              <div className="message-user">{msg.userId.name}</div>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        {typingText && <div className="typing-indicator">{typingText}</div>}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Введите сообщение..."
        />
        <button type="submit" disabled={!newMessage.trim()}>➤</button>
      </form>
    </div>
  );
};

export default ChatWindow;