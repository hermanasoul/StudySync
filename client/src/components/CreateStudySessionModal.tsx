// client/src/components/CreateStudySessionModal.tsx

import React, { useState, useEffect } from 'react';
import { studySessionsAPI, flashcardsAPI, subjectsAPI, groupsAPI } from '../services/api';
import './CreateStudySessionModal.css';

interface Subject {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
}

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  difficulty: string;
}

interface CreateStudySessionModalProps {
  onClose: () => void;
  onSessionCreated: (session: any) => void;
  subjects: Subject[];
  groups?: Group[];
}

const CreateStudySessionModal: React.FC<CreateStudySessionModalProps> = ({
  onClose,
  onSessionCreated,
  subjects,
  groups = []
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Основные данные сессии
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [groupId, setGroupId] = useState('');

  // Настройки доступа
  const [accessType, setAccessType] = useState<'public' | 'friends' | 'private'>('public');
  const [studyMode, setStudyMode] = useState<'collaborative' | 'individual' | 'host-controlled'>('collaborative');

  // Настройки Pomodoro
  const [pomodoroSettings, setPomodoroSettings] = useState({
    workDuration: 25,
    breakDuration: 5,
    autoSwitch: true
  });

  // Карточки для изучения
  const [availableFlashcards, setAvailableFlashcards] = useState<Flashcard[]>([]);
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<string[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // Приглашенные пользователи (для приватных сессий)
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);

  // Загружаем карточки при выборе предмета
  useEffect(() => {
    if (subjectId) {
      fetchFlashcards();
    }
  }, [subjectId]);

  const fetchFlashcards = async () => {
    try {
      setFlashcardsLoading(true);
      const response = await flashcardsAPI.getBySubject(subjectId);
      if (response.data.success) {
        setAvailableFlashcards(response.data.flashcards || []);
      }
    } catch (err) {
      console.error('Error fetching flashcards:', err);
    } finally {
      setFlashcardsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && (!name.trim() || !subjectId)) {
      setError('Заполните название и выберите предмет');
      return;
    }
    
    if (step === 2 && accessType === 'private' && invitedUsers.length === 0) {
      setError('Для приватной сессии нужно добавить хотя бы одного участника');
      return;
    }
    
    setError('');
    setSuccess('');
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError('');
    setSuccess('');
  };

  const handleFlashcardToggle = (flashcardId: string) => {
    setSelectedFlashcardIds(prev => {
      if (prev.includes(flashcardId)) {
        return prev.filter(id => id !== flashcardId);
      } else {
        return [...prev, flashcardId];
      }
    });
  };

  const handleSelectAllFlashcards = () => {
    if (selectedFlashcardIds.length === availableFlashcards.length) {
      setSelectedFlashcardIds([]);
    } else {
      setSelectedFlashcardIds(availableFlashcards.map(f => f._id));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !subjectId) {
      setError('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const sessionData = {
        name: name.trim(),
        description: description.trim(),
        subjectId,
        groupId: groupId || undefined,
        accessType,
        studyMode,
        pomodoroSettings,
        flashcardIds: selectedFlashcardIds.length > 0 ? selectedFlashcardIds : undefined,
        invitedUsers: accessType === 'private' ? invitedUsers : undefined
      };

      const response = await studySessionsAPI.create(sessionData);

      if (response.data.success) {
        setSuccess('Сессия успешно создана!');
        
        // Даем время показать сообщение об успехе
        setTimeout(() => {
          onSessionCreated(response.data.session);
          onClose();
        }, 1500);
      } else {
        setError(response.data.message || 'Ошибка при создании сессии');
      }
    } catch (err: any) {
      console.error('Error creating study session:', err);
      setError(err.response?.data?.message || 'Ошибка сервера. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="create-session-step">
      <h3 className="step-title">Основные настройки</h3>
      
      <div className="form-group">
        <label className="form-label">
          Название сессии <span className="required">*</span>
        </label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Подготовка к экзамену по математике"
          maxLength={100}
        />
        <div className="form-hint">Максимум 100 символов</div>
      </div>

      <div className="form-group">
        <label className="form-label">Описание</label>
        <textarea
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Опишите цели сессии, тему для изучения или дополнительные детали..."
          rows={3}
          maxLength={500}
        />
        <div className="form-hint">{description.length}/500 символов</div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Предмет <span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">Выберите предмет</option>
            {subjects.map(subject => (
              <option key={subject._id} value={subject._id}>
                {subject.icon} {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Группа (необязательно)</label>
          <select
            className="form-select"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Без группы</option>
            {groups.map(group => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="create-session-step">
      <h3 className="step-title">Настройки доступа и режима</h3>
      
      <div className="form-group">
        <label className="form-label">Тип доступа</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="accessType"
              value="public"
              checked={accessType === 'public'}
              onChange={(e) => setAccessType(e.target.value as 'public')}
            />
            <span className="radio-custom"></span>
            <div className="radio-content">
              <div className="radio-title">Публичная</div>
              <div className="radio-description">
                Сессию видят все пользователи, можно присоединиться без приглашения
              </div>
            </div>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="accessType"
              value="friends"
              checked={accessType === 'friends'}
              onChange={(e) => setAccessType(e.target.value as 'friends')}
            />
            <span className="radio-custom"></span>
            <div className="radio-content">
              <div className="radio-title">Для друзей</div>
              <div className="radio-description">
                Видят только ваши друзья, могут присоединиться без приглашения
              </div>
            </div>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="accessType"
              value="private"
              checked={accessType === 'private'}
              onChange={(e) => setAccessType(e.target.value as 'private')}
            />
            <span className="radio-custom"></span>
            <div className="radio-content">
              <div className="radio-title">Приватная</div>
              <div className="radio-description">
                Только приглашенные пользователи могут видеть и присоединяться
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Режим обучения</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="studyMode"
              value="collaborative"
              checked={studyMode === 'collaborative'}
              onChange={(e) => setStudyMode(e.target.value as 'collaborative')}
            />
            <span className="radio-custom"></span>
            <div className="radio-content">
              <div className="radio-title">Совместный</div>
              <div className="radio-description">
                Все участники видят одни и те же карточки и могут отвечать одновременно
              </div>
            </div>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="studyMode"
              value="individual"
              checked={studyMode === 'individual'}
              onChange={(e) => setStudyMode(e.target.value as 'individual')}
            />
            <span className="radio-custom"></span>
            <div className="radio-content">
              <div className="radio-title">Индивидуальный</div>
              <div className="radio-description">
                Каждый участник изучает карточки в своем собственном темпе
              </div>
            </div>
          </label>

          <label className="radio-label">
            <input
              type="radio"
              name="studyMode"
              value="host-controlled"
              checked={studyMode === 'host-controlled'}
              onChange={(e) => setStudyMode(e.target.value as 'host-controlled')}
            />
            <span className="radio-custom"></span>
            <div className="radio-content">
              <div className="radio-title">Ведущий управляет</div>
              <div className="radio-description">
                Только ведущий управляет карточками, участники видят его выбор
              </div>
            </div>
          </label>
        </div>
      </div>

      {accessType === 'private' && (
        <div className="form-group">
          <label className="form-label">Пригласить пользователей</label>
          <div className="invite-section">
            <p className="invite-hint">
              Приватная сессия. Добавьте пользователей, которых хотите пригласить.
            </p>
            {/* Здесь можно добавить компонент для выбора пользователей */}
            <div className="placeholder-invite">
              ⚠️ Функция приглашения пользователей будет добавлена в следующем обновлении
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="create-session-step">
      <h3 className="step-title">Настройки Pomodoro</h3>
      
      <div className="form-group">
        <label className="form-label">Длительность рабочего интервала (минуты)</label>
        <div className="slider-group">
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={pomodoroSettings.workDuration}
            onChange={(e) => setPomodoroSettings(prev => ({
              ...prev,
              workDuration: parseInt(e.target.value)
            }))}
            className="slider-input"
          />
          <div className="slider-value">{pomodoroSettings.workDuration} мин</div>
        </div>
        <div className="form-hint">Рекомендуется: 25 минут</div>
      </div>

      <div className="form-group">
        <label className="form-label">Длительность перерыва (минуты)</label>
        <div className="slider-group">
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={pomodoroSettings.breakDuration}
            onChange={(e) => setPomodoroSettings(prev => ({
              ...prev,
              breakDuration: parseInt(e.target.value)
            }))}
            className="slider-input"
          />
          <div className="slider-value">{pomodoroSettings.breakDuration} мин</div>
        </div>
        <div className="form-hint">Рекомендуется: 5 минут</div>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={pomodoroSettings.autoSwitch}
            onChange={(e) => setPomodoroSettings(prev => ({
              ...prev,
              autoSwitch: e.target.checked
            }))}
          />
          <span className="checkbox-custom"></span>
          Автоматически переключать интервалы
        </label>
        <div className="form-hint">
          При включении таймер автоматически переключится на следующий интервал
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="create-session-step">
      <h3 className="step-title">Выбор карточек для изучения</h3>
      
      {!subjectId ? (
        <div className="no-subject-message">
          <div className="no-subject-icon">📚</div>
          <p>Выберите предмет на первом шаге, чтобы увидеть доступные карточки</p>
        </div>
      ) : flashcardsLoading ? (
        <div className="loading-flashcards">
          <div className="spinner"></div>
          <div>Загрузка карточек...</div>
        </div>
      ) : availableFlashcards.length === 0 ? (
        <div className="no-flashcards-message">
          <div className="no-flashcards-icon">🃏</div>
          <p>У вас нет карточек по этому предмету</p>
          <p className="hint">Создайте карточки в разделе "Карточки"</p>
        </div>
      ) : (
        <>
          <div className="flashcards-header">
            <div className="flashcards-count">
              Доступно карточек: {availableFlashcards.length}
            </div>
            <button
              type="button"
              className="btn-select-all"
              onClick={handleSelectAllFlashcards}
            >
              {selectedFlashcardIds.length === availableFlashcards.length 
                ? 'Снять все' 
                : 'Выбрать все'}
            </button>
          </div>

          <div className="flashcards-grid">
            {availableFlashcards.map(flashcard => (
              <div
                key={flashcard._id}
                className={`flashcard-item ${
                  selectedFlashcardIds.includes(flashcard._id) ? 'selected' : ''
                }`}
                onClick={() => handleFlashcardToggle(flashcard._id)}
              >
                <div className="flashcard-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFlashcardIds.includes(flashcard._id)}
                    onChange={() => handleFlashcardToggle(flashcard._id)}
                  />
                </div>
                <div className="flashcard-content">
                  <div className="flashcard-question">
                    {flashcard.question.length > 50
                      ? flashcard.question.substring(0, 50) + '...'
                      : flashcard.question}
                  </div>
                  <div className="flashcard-meta">
                    <span className={`difficulty-badge ${flashcard.difficulty}`}>
                      {flashcard.difficulty === 'easy' && 'Легкая'}
                      {flashcard.difficulty === 'medium' && 'Средняя'}
                      {flashcard.difficulty === 'hard' && 'Сложная'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="selected-count">
            Выбрано карточек: {selectedFlashcardIds.length}
            {selectedFlashcardIds.length === 0 && (
              <span className="hint"> (если не выбрать карточки, будут использоваться все доступные)</span>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderProgress = () => (
    <div className="progress-bar">
      <div className="progress-steps">
        {[1, 2, 3, 4].map(num => (
          <div
            key={num}
            className={`progress-step ${num === step ? 'active' : ''} ${num < step ? 'completed' : ''}`}
          >
            <div className="step-number">{num}</div>
            <div className="step-label">
              {num === 1 && 'Основное'}
              {num === 2 && 'Доступ'}
              {num === 3 && 'Таймер'}
              {num === 4 && 'Карточки'}
            </div>
          </div>
        ))}
      </div>
      <div className="progress-line">
        <div 
          className="progress-fill"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-session-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Создание учебной сессии</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {renderProgress()}

        <div className="modal-body">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              {success}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-buttons">
            {step > 1 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handlePrevStep}
                disabled={loading}
              >
                Назад
              </button>
            )}
            
            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNextStep}
                disabled={loading}
              >
                Далее
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={loading || !name.trim() || !subjectId}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Создание...
                  </>
                ) : (
                  'Создать сессию'
                )}
              </button>
            )}
          </div>
          
          <div className="step-info">
            Шаг {step} из 4
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStudySessionModal;