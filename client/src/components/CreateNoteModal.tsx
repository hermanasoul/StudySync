// client/src/components/CreateNoteModal.tsx

import React, { useState } from 'react';
import { notesAPI, achievementsAPI } from '../services/api';
import './CreateNoteModal.css';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: { title: string; content: string; tags: string[] }) => void;
  subjectId: string;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ isOpen, onClose, onSubmit, subjectId }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Введите заголовок'); return; }
    if (!content.trim()) { setError('Введите содержание'); return; }
    if (!subjectId) { setError('Не указан предмет'); return; }

    setLoading(true);
    setError('');

    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      await notesAPI.create({
        title: title.trim(),
        content: content.trim(),
        tags: tagArray,
        subjectId: subjectId
      });

      try {
        await achievementsAPI.check('FIRST_NOTE');
      } catch (achErr) {
        console.error('Achievement error:', achErr);
      }

      setTitle('');
      setContent('');
      setTags('');
      onSubmit({ title: title.trim(), content: content.trim(), tags: tagArray });
      onClose();
    } catch (err: any) {
      console.error('Create note error:', err);
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Ошибка при создании заметки';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать заметку</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="note-form">
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label htmlFor="title">Заголовок *</label>
            <input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Введите заголовок" required maxLength={100} disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="content">Содержание *</label>
            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} placeholder="Текст заметки..." required rows={5} maxLength={10000} disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Теги (через запятую)</label>
            <input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="важно, экзамен" disabled={loading} />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-outline" disabled={loading}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading || !title.trim() || !content.trim()}>Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;