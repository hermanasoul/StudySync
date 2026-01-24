import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './MessageBubble.css';

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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTime: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  showTime
}) => {
  const { user } = useAuth();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  if (message.type === 'system') {
    return (
      <div className="system-message">
        <div className="system-content">{message.content}</div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOwn && !message.isDeleted) {
      setShowContextMenu(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowContextMenu(false);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== message.content) {
      try {
        // TODO: Вызов API для редактирования сообщения
        console.log('Editing message:', message._id, editContent);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
      try {
        // TODO: Вызов API для удаления сообщения
        console.log('Deleting message:', message._id);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
    setShowContextMenu(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowContextMenu(false);
  };

  return (
    <div 
      className={`message-wrapper ${isOwn ? 'own-message' : 'other-message'}`}
      onContextMenu={handleContextMenu}
    >
      {showAvatar && !isOwn && (
        <div className="message-avatar">
          {message.senderId.avatarUrl ? (
            <img 
              src={message.senderId.avatarUrl} 
              alt={message.senderId.name}
              className="avatar-img"
            />
          ) : (
            <div className="avatar-text">
              {message.senderId.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="avatar-level">{message.senderId.level}</div>
        </div>
      )}

      <div className="message-content-wrapper">
        {!isOwn && showAvatar && (
          <div className="message-sender">{message.senderId.name}</div>
        )}

        {message.replyTo && (
          <div className="message-reply">
            <div className="reply-sender">
              {message.replyTo.senderId._id === user?.id ? 'Вы' : message.replyTo.senderId.name}
            </div>
            <div className="reply-content">
              {message.replyTo.content.length > 50
                ? message.replyTo.content.substring(0, 50) + '...'
                : message.replyTo.content}
            </div>
          </div>
        )}

        <div className="message-bubble-container">
          {isEditing ? (
            <div className="message-edit-container">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                className="message-edit-input"
                autoFocus
              />
              <div className="message-edit-actions">
                <button 
                  className="edit-btn save"
                  onClick={handleSaveEdit}
                >
                  Сохранить
                </button>
                <button 
                  className="edit-btn cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
                <div className="message-text">
                  {message.content}
                  {message.isEdited && !message.isDeleted && (
                    <span className="edited-badge"> (ред.)</span>
                  )}
                </div>
              </div>

              {showContextMenu && isOwn && !message.isDeleted && (
                <div className="message-context-menu">
                  <button className="context-menu-item" onClick={handleEdit}>
                    Редактировать
                  </button>
                  <button className="context-menu-item" onClick={handleCopy}>
                    Копировать
                  </button>
                  <button className="context-menu-item delete" onClick={handleDelete}>
                    Удалить
                  </button>
                </div>
              )}
            </>
          )}

          <div className="message-meta">
            {showTime && (
              <span className="message-time">
                {formatTime(message.sentAt)}
              </span>
            )}
            
            {isOwn && message.readBy.length > 0 && (
              <span className="message-read">
                Прочитано
              </span>
            )}
          </div>
        </div>
      </div>

      {showContextMenu && (
        <div 
          className="context-menu-overlay"
          onClick={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
};

export default MessageBubble;