import React, { useState } from 'react';
import { flashcardsAPI } from '../services/api';
import './CreateFlashcardModal.css';

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  groupId?: string;
  onFlashcardCreated: () => void;
}

const CreateFlashcardModal: React.FC<CreateFlashcardModalProps> = ({
  isOpen,
  onClose,
  subjectId,
  groupId,
  onFlashcardCreated
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const flashcardData: any = {
        question: question.trim(),
        answer: answer.trim(),
        difficulty,
        subjectId: subjectId
      };

      if (groupId) {
        flashcardData.groupId = groupId;
      }

      const response = await flashcardsAPI.create(flashcardData);
      
      if (response.data.success) {
        setQuestion('');
        setAnswer('');
        setDifficulty('medium');
        onFlashcardCreated();
        onClose();
      } else {
        setError(response.data.error || 'Ошибка при создании карточки');
      }
    } catch (err: any) {
      console.error('Create flashcard error:', err);
      setError('Ошибка соединения с сервером. Проверьте подключение и попробуйте снова.');
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать карточку</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flashcard-form">
          {error && <div className="error-message">{error}</div>}

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
              {loading ? 'Создание...' : 'Создать карточку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFlashcardModal;
