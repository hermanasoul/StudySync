import React, { useState, useEffect } from 'react';
import { flashcardsAPI } from '../services/api';
import './EditFlashcardModal.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
  known: boolean;
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
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (flashcard) {
      setQuestion(flashcard.question || '');
      setAnswer(flashcard.answer || '');
      setHint(flashcard.hint || '');
    }
  }, [flashcard]);

  const handleUpdate = async () => {
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await flashcardsAPI.update(flashcard!._id, {
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim()
      });
      onFlashcardUpdated();
      onClose();
    } catch (err: any) {
      console.error('Update flashcard error:', err);
      setError(err.response?.data?.error || 'Ошибка при обновлении карточки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить эту карточку?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      await flashcardsAPI.delete(flashcard!._id);
      onFlashcardDeleted();
      onClose();
    } catch (err: any) {
      console.error('Delete flashcard error:', err);
      setError(err.response?.data?.error || 'Ошибка при удалении карточки');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setAnswer('');
    setHint('');
    setError('');
    onClose();
  };

  if (!isOpen || !flashcard) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать карточку</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="flashcard-form">
          {error && (
            <div className="error-message">
              <strong>Ошибка:</strong> {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="question">Вопрос *</label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Введите вопрос..."
              required
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="answer">Ответ *</label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Введите ответ..."
              required
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="hint">Подсказка (необязательно)</label>
            <input
              id="hint"
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Введите подсказку..."
            />
          </div>
          <div className="form-actions">
            <div className="actions-left">
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={loading}
              >
                Удалить
              </button>
            </div>
            <div className="actions-right">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleUpdate}
                disabled={loading || !question.trim() || !answer.trim()}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditFlashcardModal;
