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
  onNoteDeleted: () => void; // для совместимости, но не используется
}

const EditGroupNoteModal: React.FC<EditGroupNoteModalProps> = ({
  isOpen, onClose, note, onNoteUpdated
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setError('');
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать заметку группы</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleUpdate} className="note-form" style={{ padding: '25px' }}>
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label>Заголовок</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} disabled={loading} />
          </div>
          <div className="form-group">
            <label>Содержание</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required rows={5} maxLength={10000} disabled={loading} />
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="editgroupnote-cancel-btn"
              onClick={onClose}
              disabled={loading}
              style={{ height: '34px', padding: '0 14px', fontSize: '13px', minWidth: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="editgroupnote-save-btn"
              disabled={loading}
              style={{ height: '34px', padding: '0 14px', fontSize: '13px', minWidth: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGroupNoteModal;