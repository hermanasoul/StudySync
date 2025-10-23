import React, { useState } from 'react';
import { flashcardsAPI } from '../services/api';
import './CreateFlashcardModal.css';

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlashcardCreated: () => void;
  subjectId: string;
}

const CreateFlashcardModal: React.FC<CreateFlashcardModalProps> = ({
  isOpen,
  onClose,
  onFlashcardCreated,
  subjectId
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }
    if (!subjectId) {
      setError('Не указан предмет для карточки');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await flashcardsAPI.create({
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim(),
        subjectId: subjectId
      });
      setQuestion('');
      setAnswer('');
      setHint('');
      onFlashcardCreated();
      onClose();
    } catch (err: any) {
      console.error('Create flashcard error:', err);
      setError(err.response?.data?.error || 'Ошибка при создании карточки');
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать карточку</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="flashcard-form">
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
              disabled={loading || !question.trim() || !answer.trim()}
            >
              {loading ? 'Создание...' : 'Создать карточку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFlashcardModal;
