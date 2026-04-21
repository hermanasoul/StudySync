import React from 'react';
import './AchievementCard.css';

interface AchievementCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  difficultyColor: string;
  category: string;
  points: number;
  progress?: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
  onClick?: () => void;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  name,
  description,
  icon,
  difficulty,
  difficultyColor,
  category,
  points,
  progress = 0,
  isUnlocked = false,
  unlockedAt,
  onClick
}) => {
  return (
    <div 
      className={`achievement-card hover-lift ${difficulty} ${isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={onClick}
    >
      <div className="achievement-icon-container">
        <div className="achievement-icon" style={{ borderColor: difficultyColor }}>
          {icon}
        </div>
        {isUnlocked && (
          <div className="achievement-unlocked-badge">✓</div>
        )}
      </div>
      <div className="achievement-content">
        <div className="achievement-header">
          <h3 className="achievement-name">{name}</h3>
          <span className="achievement-difficulty" style={{ color: difficultyColor }}>
            {difficulty}
          </span>
        </div>
        <p className="achievement-description">{description}</p>
        <div className="achievement-meta">
          <span className="achievement-category">{category}</span>
          <span className="achievement-points">+{points} XP</span>
        </div>
        {!isUnlocked && progress > 0 && (
          <div className="achievement-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: difficultyColor }} />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}
        {isUnlocked && unlockedAt && (
          <div className="achievement-unlocked-date">
            Разблокировано: {new Date(unlockedAt).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementCard;