import React, { useState, useEffect } from 'react';
import { flashcardsAPI } from '../services/api';
import './EditFlashcardModal.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  difficulty: string;
  knowCount: number;
  dontKnowCount: number;
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard | null;
  onFlashcardUpdated: () => void;
}

const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  onFlashcardUpdated
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (flashcard) {
      setQuestion(flashcard.question);
      setAnswer(flashcard.answer);
      setDifficulty(flashcard.difficulty as 'easy' | 'medium' | 'hard');
    }
  }, [flashcard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcard || !question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await flashcardsAPI.update(flashcard._id, {
        question: question.trim(),
        answer: answer.trim(),
        difficulty
      });

      onFlashcardUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при обновлении карточки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!flashcard) return;

    if (!window.confirm('Вы уверены, что хотите удалить эту карточку?')) {
      return;
    }

    setLoading(true);
    try {
      await flashcardsAPI.delete(flashcard._id);
      onFlashcardUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при удалении карточки');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setAnswer('');
    setDifficulty('medium');
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

        <form onSubmit={handleSubmit} className="flashcard-form">
          {error && <div className="error-message">{error}</div>}

          <div className="stats-info">
            <div className="stat-item">
              <span className="stat-label">Знаю:</span>
              <span className="stat-value">{flashcard.knowCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Не знаю:</span>
              <span className="stat-value">{flashcard.dontKnowCount}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="question">Вопрос *</label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Введите вопрос..."
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="answer">Ответ *</label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Введите ответ..."
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="difficulty">Сложность</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            >
              <option value="easy">Легкая</option>
              <option value="medium">Средняя</option>
              <option value="hard">Сложная</option>
            </select>
          </div>

          <div className="form-actions">
            <div className="left-actions">
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger"
                disabled={loading}
              >
                Удалить
              </button>
            </div>
            <div className="right-actions">
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
                disabled={loading}
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
