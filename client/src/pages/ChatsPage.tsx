import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import './ChatsPage.css';

interface ChatParticipant {
  userId: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  lastRead: string;
}

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: ChatParticipant[];
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

// Тип, ожидаемый ChatWindow
interface MappedChat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Array<{
    _id: string;
    name: string;
    avatarUrl?: string;
  }>;
  lastMessage?: {
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
  };
  unreadCount: number;
}

const ChatsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleCloseChat = () => {
    setSelectedChat(null);
  };

  // Преобразование чата к формату для ChatWindow
  const mapChatForWindow = (chat: Chat): MappedChat => {
    return {
      _id: chat._id,
      type: chat.type,
      name: chat.name,
      participants: chat.participants.map(p => ({
        _id: p.userId._id,
        name: p.userId.name,
        avatarUrl: p.userId.avatarUrl,
      })),
      unreadCount: chat.unreadCount,
      // lastMessage преобразуем, если нужно
      lastMessage: chat.lastMessage ? {
        _id: '', // временно, ChatWindow не использует _id сообщения в пропсах
        chatId: chat._id,
        userId: {
          _id: chat.lastMessage.senderId._id,
          name: chat.lastMessage.senderId.name,
        },
        content: chat.lastMessage.content,
        createdAt: chat.lastMessage.sentAt,
        isRead: false,
      } : undefined,
    };
  };

  if (!user) {
    return (
      <div className="chats-page">
        <Header />
        <div className="error">Пожалуйста, войдите в систему.</div>
      </div>
    );
  }

  return (
    <div className="chats-page">
      <Header />
      <div className="page-with-header">
        <div className="chats-container">
          <div className="chats-sidebar">
            <ChatList 
              onSelectChat={handleSelectChat}
              selectedChatId={selectedChat?._id}
            />
          </div>

          <div className="chats-main">
            {selectedChat ? (
              <ChatWindow 
                chat={mapChatForWindow(selectedChat)}
                onClose={handleCloseChat}
              />
            ) : (
              <div className="no-chat-selected">
                <div className="welcome-icon">💬</div>
                <h2>Мессенджер StudySync</h2>
                <p>Выберите чат из списка или начните новый диалог</p>
                <div className="chat-features">
                  <div className="feature">
                    <div className="feature-icon">🚀</div>
                    <div className="feature-text">
                      <h4>Общение в реальном времени</h4>
                      <p>Мгновенная отправка и получение сообщений</p>
                    </div>
                  </div>
                  <div className="feature">
                    <div className="feature-icon">👥</div>
                    <div className="feature-text">
                      <h4>Личные и групповые чаты</h4>
                      <p>Общайтесь один на один или создавайте группы</p>
                    </div>
                  </div>
                  <div className="feature">
                    <div className="feature-icon">📚</div>
                    <div className="feature-text">
                      <h4>Учебные обсуждения</h4>
                      <p>Делитесь материалами и обсуждайте учебные вопросы</p>
                    </div>
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

export default ChatsPage;