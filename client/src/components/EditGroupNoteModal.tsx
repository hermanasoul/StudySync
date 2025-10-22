import React, { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';
import './EditGroupNoteModal.css';

interface EditGroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null; // Фикс: тип Note совместим с backend
  onNoteUpdated: () => void;
  onNoteDeleted: () => void;
  groupId?: string; // Добавь, если не передаётся
}

// Фикс: интерфейс Note унифицирован с backend (как в GroupPage)
interface Note {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: {
    _id: string;
    name: string;
  };
  groupId: string;
}

const EditGroupNoteModal: React.FC<EditGroupNoteModalProps> = ({
  isOpen,
  onClose,
  note,
  onNoteUpdated,
  onNoteDeleted,
  groupId = 'default' // Fallback, передавай из пропсов
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  }, [note]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !note || !groupId) {
      setError('Заполните заголовок и содержание');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await notesAPI.update(note._id, { title: title.trim(), content: content.trim() }, groupId);
      if (response.data.success) {
        onNoteUpdated(); // Reload списка
        onClose();
      } else {
        setError(response.data.error || 'Ошибка обновления заметки');
      }
    } catch (err: any) {
      console.error('Update note error:', err);
      setError(err.response?.data?.error || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !groupId) return;
    if (!window.confirm('Удалить эту заметку?')) return;
    setLoading(true);
    setError('');
    try {
      const response = await notesAPI.delete(note._id, groupId);
      if (response.data.success) {
        onNoteDeleted(); // Reload списка
        onClose();
      } else {
        setError(response.data.error || 'Ошибка удаления заметки');
      }
    } catch (err: any) {
      console.error('Delete note error:', err);
      setError(err.response?.data?.error || 'Ошибка соединения с сервером');
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
        <form onSubmit={handleUpdate} className="note-form">
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
              placeholder="Введите заголовок..."
              required
              maxLength={100}
              disabled={loading}
            />
            <div className="input-hint">{title.length}/100 символов</div>
          </div>
          <div className="form-group">
            <label htmlFor="content">Содержание *</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите содержание..."
              rows={8}
              required
              disabled={loading}
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
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn-danger"
              disabled={loading}
              style={{ marginLeft: '10px' }}
            >
              Удалить заметку
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGroupNoteModal;
