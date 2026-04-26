// client/src/components/CreateGroupModal.tsx

import React, { useState, useEffect } from 'react';
import { groupsAPI, subjectsAPI, achievementsAPI } from '../services/api';
import './CreateGroupModal.css';

interface Subject {
  _id: string;
  name: string;
  description?: string;
  color?: string;
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
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setDescription('');
    setSubjectId('');
    setIsPublic(false);
    setError('');

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setError('');
      try {
        const response = await subjectsAPI.getAll();
        console.log('Ответ сервера /api/subjects:', response.data);

        if (response.data.success) {
          const rawSubjects = response.data.subjects || [];
          const normalized: Subject[] = rawSubjects
            .map((s: any) => ({
              _id: s._id || s.id,
              name: s.name || 'Без названия',
              description: s.description,
              color: s.color || 'blue'
            }))
            .filter((s: Subject) => s._id); // <-- явный тип

          console.log('Нормализованные предметы:', normalized);

          if (normalized.length === 0) {
            setError('Нет доступных предметов.');
            setSubjects([]);
            setSubjectId('');
            return;
          }

          setSubjects(normalized);
          setSubjectId(normalized[0]._id);
        } else {
          setError('Ошибка сервера при загрузке предметов.');
        }
      } catch (err) {
        console.error('Ошибка загрузки предметов:', err);
        setError('Не удалось загрузить список предметов.');
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Введите название группы'); return; }
    if (name.trim().length < 3) { setError('Название группы должно быть не менее 3 символов'); return; }
    if (description.length > 500) { setError('Описание не должно превышать 500 символов'); return; }
    if (!subjectId) { setError('Выберите предмет'); return; }

    const objectIdPattern = /^[a-fA-F0-9]{24}$/;
    if (!objectIdPattern.test(subjectId)) {
      setError(`Некорректный ID предмета (${subjectId}). Ожидается 24-значный hex-код.`);
      return;
    }

    console.log('Отправка группы с subjectId:', subjectId);

    setLoading(true);
    try {
      await groupsAPI.create({
        name: name.trim(),
        description: description.trim(),
        subjectId,
        isPublic,
        settings: {
          allowMemberInvites: false,
          allowMemberCreateCards: true,
          allowMemberCreateNotes: true
        }
      });

      try {
        await achievementsAPI.check('FIRST_GROUP');
        const myGroupsResponse = await groupsAPI.getMy();
        const totalGroups = myGroupsResponse.data?.groups?.length || 0;
        await achievementsAPI.check('GROUP_ORGANIZER_3', Math.min(totalGroups / 3 * 100, 100));
      } catch (achievementError) {
        console.error('Achievement check error:', achievementError);
      }

      onGroupCreated();
      onClose();
    } catch (err: any) {
      console.error('Create group error:', err);
      let message = 'Ошибка при создании группы';
      if (err.response) {
        const data = err.response.data;
        if (data.errors && Array.isArray(data.errors)) {
          message = data.errors.map((e: any) => e.msg).join('; ');
        } else if (data.error) {
          message = data.error;
        } else if (data.message) {
          message = data.message;
        } else if (typeof data === 'string') {
          message = data;
        }
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Создать группу</h2>
          <button className="close-button" onClick={handleClose} disabled={loading}>×</button>
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
              minLength={3}
              maxLength={50}
              disabled={loading}
            />
            <div className="input-hint">От 3 до 50 символов</div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите цель группы..."
              rows={3}
              maxLength={500}
              disabled={loading}
            />
            <div className="input-hint">{description.length}/500 символов</div>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Предмет *</label>
            {loadingSubjects ? (
              <div className="input-hint">Загрузка предметов...</div>
            ) : subjects.length === 0 ? (
              <div className="error-message">Нет доступных предметов.</div>
            ) : (
              <select
                id="subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Выберите предмет</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={loading}
              />
              <span className="checkmark"></span>
              Публичная группа
            </label>
            <p className="checkbox-description">
              Публичные группы видны всем и доступны для присоединения по коду
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