import React, { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';
import './EditGroupNoteModal.css';

interface EditGroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: any;
  groupId: string;
  onNoteUpdated: () => void;
  onNoteDeleted: () => void;
}

const EditGroupNoteModal: React.FC<EditGroupNoteModalProps> = ({
  isOpen,
  onClose,
  note,
  groupId,
  onNoteUpdated,
  onNoteDeleted
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
    }
  }, [note]);

  const handleUpdate = async () => {
    if (!title.trim()) {
      setError('Введите заголовок заметки');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await notesAPI.update(note._id, { 
        title: title.trim(), 
        content: content.trim(),
        groupId 
      });
      if (response.data.success) {
        onNoteUpdated();
        onClose();
      }
    } catch (err: any) {
      console.error('Update note error:', err);
      setError(err.response?.data?.error || 'Ошибка при обновлении заметки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить эту заметку?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await notesAPI.delete(note._id);
      if (response.data.success) {
        onNoteDeleted();
        onClose();
      }
    } catch (err: any) {
      console.error('Delete note error:', err);
      setError(err.response?.data?.error || 'Ошибка при удалении заметки');
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

  if (!isOpen || !note) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать заметку</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="note-form">
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
            <div className="actions-left">
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={loading}
              >
                Удалить
              </button>
            </div>
            <div className="actions-right">
              <button
                type="button"
                onClick={handleClose}
                className="btn-outline"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpdate}
                disabled={loading || !title.trim()}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGroupNoteModal;
