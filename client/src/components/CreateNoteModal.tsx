import React, { useState, useRef, useEffect } from 'react';
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
  const isSubmitting = useRef(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Сброс флага при открытии модалки
  useEffect(() => {
    if (isOpen) {
      isSubmitting.current = false;
    }
  }, [isOpen]);

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

    // Блокировка: если уже отправляется, ничего не делаем
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    // Валидация
    if (!title.trim()) {
      setError('Введите заголовок');
      isSubmitting.current = false;
      return;
    }
    if (!content.trim()) {
      setError('Введите содержание');
      isSubmitting.current = false;
      return;
    }
    if (!subjectId) {
      setError('Не указан предмет');
      isSubmitting.current = false;
      return;
    }

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
      const msg = extractError(err.response?.data);
      setError(msg);
    } finally {
      setLoading(false);
      // Разблокируем только после полного завершения (успех или ошибка)
      isSubmitting.current = false;
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
            <button ref={submitButtonRef} type="submit" className="btn-primary" disabled={loading || !title.trim() || !content.trim() || isSubmitting.current}>
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;