// client/src/components/StudyCompleteModal.tsx

import React from 'react';
import './StudyCompleteModal.css';

interface StudyCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  studiedCount: number;
  totalCount: number;
  onRestart: () => void;
  mode: 'flashcards' | 'notes';
}

const StudyCompleteModal: React.FC<StudyCompleteModalProps> = ({
  isOpen,
  onClose,
  studiedCount,
  totalCount,
  onRestart,
  mode
}) => {
  if (!isOpen) return null;

  const successRate = Math.round((studiedCount / totalCount) * 100);

  return (
    <div className="modal-overlay">
      <div className="modal-content study-complete-modal">
        <div className="study-complete-header">
          <div className="study-complete-icon">🎉</div>
          <h2>Изучение завершено!</h2>
        </div>
        
        <div className="study-complete-stats">
          <div className="stat-item">
            <span className="stat-number">{studiedCount}</span>
            <span className="stat-label">изучено</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{totalCount}</span>
            <span className="stat-label">всего</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{successRate}%</span>
            <span className="stat-label">успех</span>
          </div>
        </div>

        <div className="study-complete-message">
          {successRate >= 80 ? (
            <p>Отличный результат! Вы хорошо освоили материал.</p>
          ) : successRate >= 60 ? (
            <p>Хороший результат! Продолжайте практиковаться.</p>
          ) : (
            <p>Нужно еще немного попрактиковаться. Попробуйте снова!</p>
          )}
        </div>

        <div className="study-complete-actions">
          <button
            className="btn btn-primary"
            onClick={onRestart}
          >
            Начать заново
          </button>
          <button
            className="btn btn-outline"
            onClick={onClose}
          >
            Завершить
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyCompleteModal;
