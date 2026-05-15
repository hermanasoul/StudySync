// client/src/components/EditFlashcardModal.tsx

import React, { useState, useEffect } from 'react';
import { flashcardsAPI } from '../services/api';
import './EditFlashcardModal.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
  groupId?: string; // для совместимости с GroupPage
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard | null;
  onFlashcardUpdated: (flashcard?: Flashcard) => void;
  onFlashcardDeleted: () => void;
}

const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  onFlashcardUpdated,
  onFlashcardDeleted
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Заполняем поля при открытии модалки
  useEffect(() => {
    if (flashcard) {
      setQuestion(flashcard.question || '');
      setAnswer(flashcard.answer || '');
      setHint(flashcard.hint || '');
      setError('');
      setShowDeleteConfirm(false);
    }
  }, [flashcard, isOpen]);

  if (!isOpen || !flashcard) return null;

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
    return 'Неизвестная ошибка';
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await flashcardsAPI.update(flashcard._id, {
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim()
      });

      if (response.data.success && response.data.flashcard) {
        onFlashcardUpdated({
          ...flashcard,
          question: response.data.flashcard.question || question.trim(),
          answer: response.data.flashcard.answer || answer.trim(),
          hint: response.data.flashcard.hint || hint.trim()
        });
      } else {
        onFlashcardUpdated();
      }
      onClose();
    } catch (err: any) {
      const msg = extractError(err.response?.data);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await flashcardsAPI.delete(flashcard._id);
      onFlashcardDeleted();
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

        {/* Кастомное подтверждение удаления */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay" onClick={cancelDelete}>
            <div className="delete-confirm-dialog" onClick={e => e.stopPropagation()}>
              <p>Удалить эту карточку?</p>
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

export default EditFlashcardModal;