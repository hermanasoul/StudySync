import React, { useState } from 'react';
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
    if (!content.trim()) {
      setError('Введите содержание заметки');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Имитируем API запрос
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Сохраняем заметку в localStorage для демонстрации
      const existingNotes = JSON.parse(localStorage.getItem('group_notes') || '{}');
      const groupNotes = existingNotes[groupId] || [];
      
      const newNote = {
        id: Date.now().toString(),
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        groupId: groupId
      };
      
      groupNotes.unshift(newNote);
      existingNotes[groupId] = groupNotes;
      localStorage.setItem('group_notes', JSON.stringify(existingNotes));

      setTitle('');
      setContent('');
      onNoteCreated();
      onClose();
    } catch (err: any) {
      setError('Ошибка при создании заметки. Попробуйте снова.');
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
              maxLength={100}
            />
            <div className="input-hint">{title.length}/100 символов</div>
          </div>

          <div className="form-group">
            <label htmlFor="content">Содержание *</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите содержание заметки..."
              rows={8}
              required
            />
            <div className="input-hint">
              Поддерживается обычный текст. Вы можете добавлять списки, определения и важные моменты.
            </div>
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
              {loading ? 'Создание...' : 'Создать заметку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupNoteModal;
