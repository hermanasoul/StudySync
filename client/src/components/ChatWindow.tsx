// client/src/components/ChatWindow.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import ScheduledMessages from './ScheduledMessages';
import './ChatWindow.css';

interface Attachment {
  url: string;
  filename: string;
  fileType: string;
  size: number;
}

interface FileWithPreview extends File {
  preview?: string;
  customName?: string;
}

interface Message {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  attachments?: Attachment[];
  scheduledAt?: string | null;
  isEdited?: boolean;
  deleted?: boolean;
  createdAt: string;
}

interface ChatWindowProps {
  chatId: string;
  onClose: () => void;
  onChatsChanged?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, onClose, onChatsChanged }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduled, setShowScheduled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    messageId: string;
    isOwn: boolean;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!chatId) return;

    const loadMessages = async () => {
      try {
        const res = await chatsAPI.getChatMessages(chatId);
        setMessages(res.data.data || []);
      } catch (err) {
        console.error('Ошибка загрузки сообщений:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    webSocketService.joinChat(chatId);

    const handleNewMessage = (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      onChatsChanged?.();
    };

    const handleUpdatedMessage = (msg: Message) => {
      setMessages(prev => prev.map(m => m._id === msg._id ? msg : m));
    };

    const handleDeletedMessage = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== data.messageId));
      onChatsChanged?.();
    };

    webSocketService.on('new_message', handleNewMessage);
    webSocketService.on('message_updated', handleUpdatedMessage);
    webSocketService.on('message_deleted', handleDeletedMessage);

    return () => {
      webSocketService.leaveChat(chatId);
      webSocketService.off('new_message', handleNewMessage);
      webSocketService.off('message_updated', handleUpdatedMessage);
      webSocketService.off('message_deleted', handleDeletedMessage);
    };
  }, [chatId, onChatsChanged]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map(file => {
        const f = file as FileWithPreview;
        f.preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        f.customName = file.name;
        return f;
      });
      setAttachments(prev => [...prev, ...files]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileNameChange = (index: number, newName: string) => {
    setAttachments(prev => prev.map((f, i) => i === index ? { ...f, customName: newName } : f));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content && attachments.length === 0) return;

    const formData = new FormData();
    formData.append('content', content);
    attachments.forEach((file) => {
      const renamedFile = new File([file], file.customName || file.name, { type: file.type });
      formData.append('attachments', renamedFile);
    });
    if (scheduledTime) {
      formData.append('scheduledAt', new Date(scheduledTime).toISOString());
    }

    try {
      const res = await chatsAPI.sendMessageFormData(chatId, formData);
      if (res.data.success && res.data.message) {
        if (!res.data.message.scheduledAt) {
          setMessages(prev => {
            if (prev.some(m => m._id === res.data.message._id)) return prev;
            return [...prev, res.data.message];
          });
        }
        onChatsChanged?.();
      }
    } catch (err) {
      console.error('Ошибка отправки:', err);
    }

    setNewMessage('');
    setAttachments([]);
    setScheduledTime('');
  };

  const handleEdit = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditContent(currentContent);
  };

  const submitEdit = async () => {
    if (!editingMessageId) return;
    try {
      const res = await chatsAPI.editMessage(editingMessageId, { content: editContent });
      if (res.data.success) {
        setMessages(prev => prev.map(m => m._id === editingMessageId ? { ...m, content: res.data.message.content, isEdited: true } : m));
        setEditingMessageId(null);
        setEditContent('');
      }
    } catch (err) {
      console.error('Ошибка редактирования:', err);
    }
  };

  const confirmDelete = (messageId: string) => {
    const msg = messages.find(m => m._id === messageId);
    const isOwn = msg?.sender._id === user?.id;
    setDeleteConfirm({ messageId, isOwn: !!isOwn });
  };

  const handleDelete = async (mode: 'for-me' | 'for-all') => {
    if (!deleteConfirm) return;
    const { messageId } = deleteConfirm;
    setDeleteConfirm(null);

    setMessages(prev => prev.filter(m => m._id !== messageId));

    try {
      if (mode === 'for-all' && deleteConfirm.isOwn) {
        await chatsAPI.deleteMessage(messageId);
      } else {
        await chatsAPI.deleteMessageForMe(messageId);
      }
      onChatsChanged?.();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить сообщение');
      const res = await chatsAPI.getChatMessages(chatId);
      setMessages(res.data.data || []);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const renderAttachment = (att: Attachment, idx: number) => {
    const isImage = att.fileType?.startsWith('image/');
    const fileUrl = att.url.startsWith('http') ? att.url : `http://localhost:5000${att.url}`;
    const sizeKB = (att.size / 1024).toFixed(1);

    return (
      <div key={idx} className="attachment">
        {isImage ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <img src={fileUrl} alt={att.filename} className="attachment-image" />
          </a>
        ) : (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="attachment-doc">
            <span className="attachment-icon">📎</span> {att.filename} ({sizeKB} КБ)
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h4>Чат</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="chat-messages">
        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">Нет сообщений</div>
        ) : (
          messages.map(msg => (
            <div
              key={msg._id}
              className={`message ${msg.sender._id === user?.id ? 'own' : ''} ${msg.deleted ? 'deleted-message' : ''}`}
            >
              {!msg.deleted && (
                <span className="message-sender">{msg.sender.name}:</span>
              )}
              <div className="message-bubble">
                {msg.deleted ? (
                  <em className="deleted-text">Сообщение удалено</em>
                ) : editingMessageId === msg._id ? (
                  <div className="edit-mode">
                    <input
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && submitEdit()}
                    />
                    <div className="edit-actions">
                      <button onClick={submitEdit} title="Сохранить">✓</button>
                      <button onClick={() => setEditingMessageId(null)} title="Отмена">✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="message-text">{msg.content}{msg.isEdited && ' (изменено)'}</span>
                    {msg.attachments?.map((att, i) => renderAttachment(att, i))}
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.scheduledAt && !msg.createdAt ? ' (запланировано)' : ''}
                    </span>
                  </>
                )}
              </div>
              {msg.sender._id === user?.id && !msg.deleted && editingMessageId !== msg._id && (
                <div className="message-actions">
                  <button onClick={() => handleEdit(msg._id, msg.content)} title="Редактировать">✎</button>
                  <button onClick={() => confirmDelete(msg._id)} title="Удалить">✕</button>
                </div>
              )}
              {msg.sender._id !== user?.id && !msg.deleted && (
                <div className="message-actions">
                  <button onClick={() => confirmDelete(msg._id)} title="Удалить у меня">✕</button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {deleteConfirm && (
        <div className="delete-confirm-overlay" onClick={cancelDelete}>
          <div className="delete-confirm-dialog" onClick={e => e.stopPropagation()}>
            <p>Удалить сообщение?</p>
            <div className="delete-confirm-actions">
              {deleteConfirm.isOwn && (
                <button onClick={() => handleDelete('for-all')} className="btn btn-danger btn-sm">
                  Удалить у всех
                </button>
              )}
              <button onClick={() => handleDelete('for-me')} className="btn btn-outline btn-sm">
                Удалить у меня
              </button>
              <button onClick={cancelDelete} className="btn btn-outline btn-sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {showScheduled && (
        <ScheduledMessages onClose={() => setShowScheduled(false)} />
      )}

      <form className="chat-input" onSubmit={handleSend}>
        {attachments.length > 0 && (
          <div className="attachment-preview">
            {attachments.map((file, idx) => (
              <div key={idx} className="preview-item">
                {file.type.startsWith('image/') && file.preview && (
                  <img src={file.preview} alt={file.customName} className="preview-thumb" />
                )}
                <div className="preview-info">
                  <input
                    type="text"
                    className="preview-filename"
                    value={file.customName || file.name}
                    onChange={e => handleFileNameChange(idx, e.target.value)}
                  />
                  <span className="preview-size">{(file.size / 1024).toFixed(1)} КБ</span>
                </div>
                <button type="button" className="preview-remove" onClick={() => removeAttachment(idx)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="input-row">
          <input
            type="text"
            className="message-input"
            placeholder="Сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="attachment-btn" title="Прикрепить файл">📎</label>
        </div>
        <div className="input-extras">
          <div className="scheduled-wrapper">
            <input
              type="datetime-local"
              className="scheduled-input"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              placeholder="Отложить до..."
            />
          </div>
          <button
            type="button"
            className="btn-scheduled"
            title="Отложенные сообщения"
            onClick={() => setShowScheduled(true)}
          >
            📅
          </button>
          <button type="submit" className="send-btn">➤</button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;