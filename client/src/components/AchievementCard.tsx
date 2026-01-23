// client/src/components/AchievementCard.tsx

import React from 'react';
import './AchievementCard.css';

interface AchievementCardProps {
  achievement: {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
    difficultyClass: string;
    difficultyColor: string;
    points: number;
    secret: boolean;
    progress?: number;
    isUnlocked?: boolean;
    unlockedAt?: string;
    requirements?: any;
  };
  showProgress?: boolean;
  onClick?: () => void;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ 
  achievement, 
  showProgress = true,
  onClick 
}) => {
  const getDifficultyLabel = (difficulty: string) => {
    const labels: { [key: string]: string } = {
      bronze: 'Бронза',
      silver: 'Серебро',
      gold: 'Золото',
      platinum: 'Платина'
    };
    return labels[difficulty] || difficulty;
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      study: 'Учёба',
      group: 'Группы',
      flashcard: 'Карточки',
      note: 'Заметки',
      social: 'Социальное',
      system: 'Системное'
    };
    return labels[category] || category;
  };

  const isSecret = achievement.secret && !achievement.isUnlocked;
  
  return (
    <div 
      className={`achievement-card ${achievement.difficultyClass} ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="achievement-icon-container">
        <div 
          className="achievement-icon"
          style={{ 
            backgroundColor: achievement.difficultyColor + '20',
            borderColor: achievement.difficultyColor 
          }}
        >
          {isSecret ? '❓' : achievement.icon}
        </div>
        {achievement.isUnlocked && (
          <div className="achievement-unlocked-badge">✓</div>
        )}
      </div>
      
      <div className="achievement-content">
        <div className="achievement-header">
          <h3 className="achievement-name">
            {isSecret ? 'Секретное достижение' : achievement.name}
          </h3>
          <span 
            className="achievement-difficulty"
            style={{ color: achievement.difficultyColor }}
          >
            {getDifficultyLabel(achievement.difficulty)}
          </span>
        </div>
        
        <p className="achievement-description">
          {isSecret ? 'Разблокируйте достижение, чтобы увидеть описание' : achievement.description}
        </p>
        
        <div className="achievement-meta">
          <span className="achievement-category">
            {getCategoryLabel(achievement.category)}
          </span>
          <span className="achievement-points">
            {achievement.points} очков
          </span>
        </div>
        
        {showProgress && achievement.progress !== undefined && (
          <div className="achievement-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${achievement.isUnlocked ? 100 : achievement.progress}%`,
                  backgroundColor: achievement.difficultyColor
                }}
              />
            </div>
            <span className="progress-text">
              {achievement.isUnlocked ? 'Разблокировано' : `${Math.round(achievement.progress)}%`}
            </span>
          </div>
        )}
        
        {achievement.isUnlocked && achievement.unlockedAt && (
          <div className="achievement-unlocked-date">
            Получено: {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementCard;