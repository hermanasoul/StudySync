// client/src/components/EditFlashcardModal.tsx

import React, { useState } from 'react';
import { flashcardsAPI } from '../services/api';
import './EditFlashcardModal.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard | null;
  onFlashcardUpdated: () => void;
  onFlashcardDeleted: () => void;
}

const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  onFlashcardUpdated,
  onFlashcardDeleted
}) => {
  const [question, setQuestion] = useState(flashcard?.question || '');
  const [answer, setAnswer] = useState(flashcard?.answer || '');
  const [hint, setHint] = useState(flashcard?.hint || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !flashcard) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await flashcardsAPI.update(flashcard._id, {
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim()
      });
      onFlashcardUpdated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Ошибка обновления';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить карточку?')) return;
    setLoading(true);
    try {
      await flashcardsAPI.delete(flashcard._id);
      onFlashcardDeleted();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Ошибка удаления';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать карточку</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleUpdate}>
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label>Вопрос</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} required rows={3} maxLength={500} />
          </div>
          <div className="form-group">
            <label>Ответ</label>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} required rows={3} maxLength={1000} />
          </div>
          <div className="form-group">
            <label>Подсказка</label>
            <input value={hint} onChange={e => setHint(e.target.value)} maxLength={200} />
          </div>
          <div className="form-actions">
            <button type="button" onClick={handleDelete} className="btn-danger" disabled={loading}>Удалить</button>
            <button type="submit" className="btn-primary" disabled={loading}>Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFlashcardModal;