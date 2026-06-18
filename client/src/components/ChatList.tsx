import React from 'react';
import { useAuth } from '../context/AuthContext';
import './ChatList.css';

interface Chat {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: Array<{ _id: string; name: string; avatarUrl?: string }>;
  lastMessage?: {
    content: string;
    sender: { name: string };
    createdAt: string;
  };
  unreadCount: number;
}

interface ChatListProps {
  chats: Chat[];
  loading: boolean;
  onSelectChat: (chatId: string) => void;
  activeChatId?: string;
}

const ChatList: React.FC<ChatListProps> = ({ chats, loading, onSelectChat, activeChatId }) => {
  const { user } = useAuth();  // <-- используем контекст

  const getChatName = (chat: Chat): string => {
    if (chat.type === 'group') return chat.name || 'Группа';
    if (!chat.participants || chat.participants.length === 0) return 'Чат';
    const other = chat.participants.find(p => p._id !== user?.id);
    return other?.name || 'Чат';
  };

  if (loading) return <div className="chat-list-loading">Загрузка чатов...</div>;

  return (
    <div className="chat-list">
      {chats.length === 0 ? (
        <p className="no-chats">Нет чатов. Создайте новый чат с друзьями.</p>
      ) : (
        chats.map(chat => (
          <div
            key={chat._id}
            className={`chat-item ${chat._id === activeChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(chat._id)}
          >
            <div className="chat-name">{getChatName(chat)}</div>
            <div className="chat-last-msg">
              {chat.lastMessage ? chat.lastMessage.content.substring(0, 30) : 'Нет сообщений'}
            </div>
            {(chat.unreadCount ?? 0) > 0 && (
              <span className="unread-badge">{chat.unreadCount}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ChatList;