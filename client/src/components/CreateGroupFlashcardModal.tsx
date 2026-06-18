import React, { useState } from 'react';
import { flashcardsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './CreateGroupFlashcardModal.css';

interface CreateGroupFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  subjectId: string;
  onFlashcardCreated: (newCard?: any) => void;
}

const CreateGroupFlashcardModal: React.FC<CreateGroupFlashcardModalProps> = ({
  isOpen, onClose, groupId, subjectId, onFlashcardCreated
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    return 'Ошибка при создании карточки';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Заполните вопрос и ответ');
      return;
    }
    if (!subjectId || subjectId === 'undefined' || subjectId === '') {
      setError('Не указан предмет для карточки');
      return;
    }
    if (!groupId || groupId === 'undefined') {
      setError('Не указан идентификатор группы');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await flashcardsAPI.create({
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim(),
        subjectId: subjectId,
        groupId: groupId
      });

      const newCard = response.data.flashcard;
      if (newCard) {
        webSocketService.sendFlashcardCreated(groupId, {
          id: newCard._id || newCard.id,
          question: newCard.question,
          answer: newCard.answer,
          hint: newCard.hint,
          authorId: {
            id: newCard.authorId?._id || newCard.authorId?.id || '',
            name: newCard.authorId?.name || 'Пользователь'
          }
        });

        onFlashcardCreated({
          _id: newCard._id || newCard.id,
          question: newCard.question,
          answer: newCard.answer,
          hint: newCard.hint,
          subjectId: subjectId,
          groupId: groupId,
        });
      } else {
        onFlashcardCreated();
      }

      // Сбрасываем поля только при успешном создании
      setQuestion('');
      setAnswer('');
      setHint('');
      onClose();
    } catch (err: any) {
      const msg = extractError(err.response?.data);
      setError(msg);
      // поля не сбрасываются, остаются заполненными
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Не сбрасываем поля, чтобы можно было продолжить редактирование при повторном открытии
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={handleClose}>×</button>
        <div className="modal-header">
          <h2>Создать карточку для группы</h2>
        </div>
        <form onSubmit={handleSubmit} className="flashcard-form">
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label htmlFor="question">Вопрос *</label>
            <textarea id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Введите вопрос..." required rows={3} />
          </div>
          <div className="form-group">
            <label htmlFor="answer">Ответ *</label>
            <textarea id="answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Введите ответ..." required rows={3} />
          </div>
          <div className="form-group">
            <label htmlFor="hint">Подсказка (необязательно)</label>
            <input id="hint" type="text" value={hint} onChange={e => setHint(e.target.value)} placeholder="Введите подсказку..." />
          </div>
          <div className="form-actions">
            <button type="button" onClick={handleClose} className="btn-secondary" disabled={loading}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading || !question.trim() || !answer.trim()}>
              {loading ? 'Создание...' : 'Создать карточку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupFlashcardModal;