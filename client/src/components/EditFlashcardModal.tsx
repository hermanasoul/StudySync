import React, { useState, useEffect } from 'react';
import './EditFlashcardModal.css';
import { flashcardsAPI } from '../services/api';

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
  onFlashcardUpdated: (updated?: Flashcard) => void;
  onFlashcardDeleted: () => void; // больше не используется, но оставляем для совместимости
}

const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  onFlashcardUpdated,
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

  if (!isOpen || !flashcard) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const updated = await flashcardsAPI.update(flashcard._id, {
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim() || undefined,
      });
      if (updated.data.success) {
        onFlashcardUpdated(updated.data.flashcard);
        onClose();
      } else {
        setError(updated.data.message || 'Ошибка обновления');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сети');
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
        <form onSubmit={handleSubmit} className="flashcard-form" style={{ padding: '25px' }}>
          {error && <div className="error-message">{error}</div>}
          <div className="stats-info">
            <div className="stat-item">
              <span className="stat-label">Вопрос</span>
              <span className="stat-value">{question.length > 0 ? question.length : '0'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ответ</span>
              <span className="stat-value">{answer.length > 0 ? answer.length : '0'}</span>
            </div>
          </div>
          <div className="form-group">
            <label>Вопрос *</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              required
              rows={3}
              disabled={loading}
              maxLength={500}
            />
          </div>
          <div className="form-group">
            <label>Ответ *</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              required
              rows={3}
              disabled={loading}
              maxLength={500}
            />
          </div>
          <div className="form-group">
            <label>Подсказка</label>
            <input
              type="text"
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Необязательная подсказка"
              disabled={loading}
              maxLength={100}
            />
          </div>
          <div className="form-actions">
            <div className="actions-right">
              <button
                type="button"
                className="editflashcard-cancel-btn"
                onClick={onClose}
                disabled={loading}
                style={{ height: '34px', padding: '0 14px', fontSize: '13px', minWidth: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="editflashcard-save-btn"
                disabled={loading}
                style={{ height: '34px', padding: '0 14px', fontSize: '13px', minWidth: 'auto', width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFlashcardModal;