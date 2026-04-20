// client/src/components/CreateNoteModal.tsx

import React, { useState } from 'react';
import './CreateNoteModal.css';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: { title: string; content: string; tags: string[] }) => Promise<void>;
  subjectId: string;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subjectId
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Заголовок и содержание обязательны');
      return;
    }

    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    setLoading(true);
    setError('');
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        tags: tagsArray
      });
      // Сброс формы
      setTitle('');
      setContent('');
      setTags('');
      onClose();
    } catch (err) {
      setError('Ошибка при создании заметки');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setTags('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать заметку</h2>
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
              placeholder="Введите заголовок"
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label htmlFor="content">Содержание *</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите текст заметки"
              required
              rows={6}
              maxLength={10000}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Теги (через запятую)</label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="математика, экзамен, формулы"
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? 'Создание...' : 'Создать заметку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;