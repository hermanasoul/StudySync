import React from 'react';
import './StudyCompleteModal.css';

interface StudyCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  mode: 'study' | 'review';
  studiedCount: number;
  totalCount: number;
}

const StudyCompleteModal: React.FC<StudyCompleteModalProps> = ({
  isOpen,
  onClose,
  onRestart,
  mode,
  studiedCount,
  totalCount
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    return mode === 'study' 
      ? '🎉 Отличная работа!' 
      : '📚 Повторение завершено!';
  };

  const getDescription = () => {
    return mode === 'study'
      ? `Вы изучили все новые карточки. Рекомендуем повторить их через некоторое время для лучшего запоминания.`
      : `Вы повторили все карточки по этому предмету. Регулярное повторение поможет закрепить знания.`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content complete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="complete-header">
          <div className="complete-icon">
            {mode === 'study' ? '🎉' : '📚'}
          </div>
          <h2>{getTitle()}</h2>
        </div>

        <div className="complete-body">
          <p>{getDescription()}</p>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">{studiedCount}</div>
              <div className="stat-label">Изучено карточек</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{totalCount}</div>
              <div className="stat-label">Всего карточек</div>
            </div>
          </div>

          <div className="progress-tip">
            {mode === 'study' 
              ? '💡 Совет: Повторите карточки через 24 часа для лучшего запоминания'
              : '💡 Совет: Возвращайтесь к повторению регулярно'
            }
          </div>
        </div>

        <div className="complete-actions">
          <button onClick={onClose} className="btn-outline">
            Вернуться позже
          </button>
          <button onClick={onRestart} className="btn-primary">
            Повторить еще раз
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyCompleteModal;
