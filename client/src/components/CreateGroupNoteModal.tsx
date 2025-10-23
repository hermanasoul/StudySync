import React, { useState } from 'react';
import { groupsAPI } from '../services/api';
import './CreateGroupNoteModal.css';

interface CreateGroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onNoteCreated: () => void;
}

const CreateGroupNoteModal: React.FC<CreateGroupNoteModalProps> = ({
  isOpen,
  onClose,
  groupId,
  onNoteCreated
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Введите заголовок заметки');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const noteData = {
        title: title.trim(),
        content: content.trim(),
        groupId
      };

      await groupsAPI.createNote(groupId, noteData);
      
      setTitle('');
      setContent('');
      onNoteCreated();
      onClose();
    } catch (err: any) {
      console.error('Create note error:', err);
      setError(err.response?.data?.error || 'Ошибка при создании заметки');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать заметку для группы</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="note-form">
          {error && (
            <div className="error-message">
              <strong>Ошибка:</strong> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Заголовок *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок заметки..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Содержание</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите содержание заметки..."
              rows={6}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-outline"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !title.trim()}
            >
              {loading ? 'Создание...' : 'Создать заметку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupNoteModal;
