// client/src/components/ScheduledMessages.tsx

import React, { useState, useEffect } from 'react';
import { chatsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './ScheduledMessages.css';

interface Attachment {
  url: string;
  filename: string;
  fileType: string;
  size: number;
}

interface ScheduledMessage {
  _id: string;
  content: string;
  scheduledAt: string;
  attachments?: Attachment[];
  chat: {
    _id: string;
    type: string;
    name?: string;
    participants: Array<{ _id: string; name: string }>;
  };
}

const ScheduledMessages: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      const res = await chatsAPI.getScheduledMessages();
      if (res.data.success) setMessages(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelMessage = async (id: string) => {
    if (!window.confirm('Отменить отправку этого сообщения?')) return;
    try {
      await chatsAPI.deleteMessage(id);
      setMessages(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error(err);
      alert('Не удалось отменить сообщение');
    }
  };

  useEffect(() => {
    loadMessages();

    const handler = () => {
      loadMessages();
    };
    webSocketService.on('scheduled_updated', handler);

    return () => {
      webSocketService.off('scheduled_updated', handler);
    };
  }, []);

  const getChatDisplayName = (chat: ScheduledMessage['chat']) => {
    if (chat.type === 'group' && chat.name) return chat.name;
    const other = chat.participants?.find(p => p._id !== localStorage.getItem('studysync_user_id'));
    return other?.name || 'Чат';
  };

  const formatSize = (bytes: number) => (bytes / 1024).toFixed(1) + ' КБ';

  return (
    <div className="scheduled-overlay" onClick={onClose}>
      <div className="scheduled-dialog" onClick={e => e.stopPropagation()}>
        <div className="scheduled-header">
          <h3>Запланированные сообщения</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="scheduled-body">
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : messages.length === 0 ? (
            <p className="no-data">Нет отложенных сообщений</p>
          ) : (
            <ul className="scheduled-list">
              {messages.map(msg => (
                <li key={msg._id} className="scheduled-item">
                  <div className="msg-info">
                    <strong>{getChatDisplayName(msg.chat)}</strong>
                    <p className="msg-content">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="msg-attachments">
                        {msg.attachments.map((att, idx) => (
                          <div key={idx} className="msg-attachment">
                            <span className="attachment-icon">📎</span>
                            <span className="attachment-name">{att.filename}</span>
                            <span className="attachment-size">({formatSize(att.size)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <small>Будет отправлено: {new Date(msg.scheduledAt).toLocaleString()}</small>
                  </div>
                  <div className="msg-actions">
                    <button className="btn btn-danger btn-small" onClick={() => cancelMessage(msg._id)}>
                      Отменить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="scheduled-footer">
          <button className="btn btn-outline" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default ScheduledMessages;