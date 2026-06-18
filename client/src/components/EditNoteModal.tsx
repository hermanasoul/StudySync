import React, { useState } from 'react';
import './EditNoteModal.css';

interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteId: string, noteData: { title: string; content: string; tags: string[] }) => Promise<void>;
  note: Note | null;
  onDelete?: (noteId: string) => Promise<void>;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, onSubmit, note, onDelete }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState(note?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    return 'Ошибка обновления';
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
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      await onSubmit(note._id, {
        title: title.trim(),
        content: content.trim(),
        tags: tagArray
      });
      onClose();
    } catch (err: any) {
      setError(extractError(err?.response?.data || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Удалить заметку?')) return;
    setLoading(true);
    try {
      await onDelete(note._id);
      onClose();
    } catch (err: any) {
      setError(extractError(err?.response?.data || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать заметку</h2>
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
          <div className="form-group">
            <label>Теги (через запятую)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="важно, экзамен" disabled={loading} />
          </div>
          <div className="form-actions">
            {onDelete && (
              <button 
                type="button" 
                className="editnote-delete-btn"
                onClick={handleDelete} 
                disabled={loading}
                style={{ height: '34px', padding: '0 14px', fontSize: '13px', minWidth: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                Удалить
              </button>
            )}
            <button 
              type="submit" 
              className="editnote-save-btn"
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

export default EditNoteModal;