import React, { useState } from 'react';
import { groupsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './CreateGroupNoteModal.css';

interface CreateGroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onNoteCreated: (newNote?: any) => void;
}

const CreateGroupNoteModal: React.FC<CreateGroupNoteModalProps> = ({
  isOpen, onClose, groupId, onNoteCreated
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const extractError = (data: any): string => {
    if (typeof data === 'string') return data;
    if (data?.error) {
      if (typeof data.error === 'string') return data.error;
      if (data.error.message) return data.error.message;
      if (data.error.errors) {
        return Object.values(data.error.errors).map((e: any) => e.message).join('; ');
      }
      return JSON.stringify(data.error);
    }
    if (data?.message) return data.message;
    return 'Ошибка при создании заметки';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Введите заголовок заметки');
      return;
    }
    if (!groupId || groupId === 'undefined') {
      setError('Не указан идентификатор группы');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const noteData = { title: title.trim(), content: content.trim(), groupId };
      const response = await groupsAPI.createNote(groupId, noteData);

      if (response.data.note) {
        webSocketService.sendNoteCreated(groupId, {
          id: response.data.note._id || response.data.note.id,
          title: response.data.note.title,
          content: response.data.note.content,
          authorId: {
            id: response.data.note.authorId?._id || response.data.note.authorId?.id || '',
            name: response.data.note.authorId?.name || 'Пользователь'
          }
        });

        onNoteCreated({
          _id: response.data.note._id || response.data.note.id,
          title: response.data.note.title,
          content: response.data.note.content,
          tags: response.data.note.tags || [],
          authorId: response.data.note.authorId,
          groupId: groupId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        onNoteCreated();
      }

      setTitle('');
      setContent('');
      onClose();
    } catch (err: any) {
      const msg = extractError(err.response?.data);
      setError(msg);
      // поля не сбрасываем при ошибке
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // не сбрасываем поля
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать заметку для группы</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="note-form">
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label htmlFor="title">Заголовок *</label>
            <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Введите заголовок заметки..." required />
          </div>
          <div className="form-group">
            <label htmlFor="content">Содержание</label>
            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} placeholder="Введите содержание заметки..." rows={6} />
          </div>
          <div className="form-actions">
            <button type="button" onClick={handleClose} className="btn-outline" disabled={loading}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading || !title.trim()}>
              {loading ? 'Создание...' : 'Создать заметку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupNoteModal;