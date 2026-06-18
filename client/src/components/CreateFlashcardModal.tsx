import React, { useState, useRef } from 'react';
import { flashcardsAPI, achievementsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './CreateFlashcardModal.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
}

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlashcardCreated: (flashcard: Flashcard) => void;
  subjectId: string;
  groupId?: string;
}

const CreateFlashcardModal: React.FC<CreateFlashcardModalProps> = ({
  isOpen, onClose, onFlashcardCreated, subjectId, groupId
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSubmitting = useRef(false);

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

    if (isSubmitting.current) return;
    isSubmitting.current = true;

    if (!question.trim()) {
      setError('Введите вопрос');
      isSubmitting.current = false;
      return;
    }
    if (!answer.trim()) {
      setError('Введите ответ');
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
      const response = await flashcardsAPI.create({
        question: question.trim(),
        answer: answer.trim(),
        hint: hint.trim(),
        subjectId: subjectId,
        groupId: groupId
      });

      const created = response.data.flashcard;
      if (created) {
        const newCard: Flashcard = {
          _id: created._id || created.id,
          question: created.question,
          answer: created.answer,
          hint: created.hint,
          subjectId: created.subjectId
        };
        onFlashcardCreated(newCard);
      } else {
        onFlashcardCreated({ _id: '', question: question.trim(), answer: answer.trim(), hint: hint.trim(), subjectId });
      }

      if (groupId && response.data.flashcard) {
        webSocketService.sendFlashcardCreated(groupId, {
          id: response.data.flashcard._id,
          question: response.data.flashcard.question,
          answer: response.data.flashcard.answer,
          hint: response.data.flashcard.hint,
          authorId: {
            id: response.data.flashcard.authorId?._id || '',
            name: response.data.flashcard.authorId?.name || 'Пользователь'
          }
        });
      }

      try { await achievementsAPI.check('FIRST_FLASHCARD'); } catch (e) { console.error(e); }

      setQuestion('');
      setAnswer('');
      setHint('');
      onClose();
    } catch (err: any) {
      setError(extractError(err.response?.data));
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleClose = () => {
    setQuestion('');
    setAnswer('');
    setHint('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать карточку</h2>
          <button className="close-button" onClick={handleClose}>×</button>
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

export default CreateFlashcardModal;