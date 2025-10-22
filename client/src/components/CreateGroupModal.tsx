import React, { useState, useEffect } from 'react';
import { groupsAPI, subjectsAPI } from '../services/api';
import './CreateGroupModal.css';

interface Subject {
  _id: string;
  name: string;
  description: string;
  color: string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSubjects();
    }
  }, [isOpen]);

  const loadSubjects = async () => {
    try {
      const response = await subjectsAPI.getAll();
      if (response.data.success) {
        setSubjects(response.data.subjects);
        if (response.data.subjects.length > 0) {
          setSubjectId(response.data.subjects[0]._id);
        }
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Более строгая валидация
    if (!name.trim()) {
      setError('Введите название группы');
      return;
    }
    
    if (!subjectId) {
      setError('Выберите предмет');
      return;
    }

    if (name.trim().length < 2) {
      setError('Название группы должно содержать минимум 2 символа');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await groupsAPI.create({
        name: name.trim(),
        description: description.trim(),
        subjectId: subjectId,
        isPublic,
        settings: {
          allowMemberInvites: false,
          allowMemberCreateCards: true,
          allowMemberCreateNotes: true
        }
      });

      // Сброс формы
      setName('');
      setDescription('');
      setSubjectId(subjects.length > 0 ? subjects[0]._id : '');
      setIsPublic(false);
      onGroupCreated();
      onClose();
    } catch (err: any) {
      console.error('Create group error:', err);
      const errorMessage = err.response?.data?.error || 'Ошибка при создании группы';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSubjectId(subjects.length > 0 ? subjects[0]._id : '');
    setIsPublic(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать группу</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="group-form">
          {error && (
            <div className="error-message">
              <strong>Ошибка:</strong> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Название группы *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название группы..."
              required
              minLength={2}
              maxLength={50}
            />
            <div className="input-hint">
              Минимум 2 символа, максимум 50 символов
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите цель группы..."
              rows={3}
              maxLength={200}
            />
            <div className="input-hint">
              {description.length}/200 символов
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Предмет *</label>
            <select
              id="subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
            >
              <option value="">Выберите предмет</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <span className="checkmark"></span>
              Публичная группа
            </label>
            <p className="checkbox-description">
              Публичные группы видны всем пользователям и можно присоединиться без приглашения
            </p>
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
              disabled={loading || !name.trim() || !subjectId}
            >
              {loading ? 'Создание...' : 'Создать группу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
