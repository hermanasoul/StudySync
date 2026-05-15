// client/src/components/EditGroupNoteModal.tsx

import React, { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';
import './EditGroupNoteModal.css';

interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
  groupId: string;
}

interface EditGroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  groupId: string;
  onNoteUpdated: () => void;
  onNoteDeleted: () => void;
}

const EditGroupNoteModal: React.FC<EditGroupNoteModalProps> = ({
  isOpen, onClose, note, onNoteUpdated, onNoteDeleted
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Заполняем поля при открытии модалки и изменении note
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setError('');
      setShowDeleteConfirm(false);
    }
  }, [note, isOpen]);

  if (!isOpen || !note) return null;

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
    return 'Ошибка';
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Заполните заголовок и содержание');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await notesAPI.update(note._id, {
        title: title.trim(),
        content: content.trim()
      });
      onNoteUpdated();
      onClose();
    } catch (err: any) {
      setError(extractError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await notesAPI.delete(note._id);
      onNoteDeleted();
      onClose();
    } catch (err: any) {
      setError(extractError(err.response?.data));
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать заметку группы</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleUpdate}>
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label>Заголовок</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} />
          </div>
          <div className="form-group">
            <label>Содержание</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required rows={5} maxLength={10000} />
          </div>
          <div className="form-actions">
            <button type="button" onClick={handleDeleteClick} className="btn-danger" disabled={loading}>Удалить</button>
            <button type="submit" className="btn-primary" disabled={loading}>Сохранить</button>
          </div>
        </form>

        {/* Кастомное подтверждение удаления */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={cancelDelete}>
            <div className="delete-confirm-dialog" onClick={e => e.stopPropagation()}>
              <p>Удалить эту заметку?</p>
              <div className="delete-confirm-actions">
                <button className="btn btn-danger btn-sm" onClick={confirmDelete} disabled={loading}>Удалить</button>
                <button className="btn btn-outline btn-sm" onClick={cancelDelete}>Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditGroupNoteModal;