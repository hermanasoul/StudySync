// client/src/components/BadgeIcon.tsx
import React from 'react';
import './BadgeIcon.css';

interface BadgeIconProps {
  badge: {
    id: string;
    icon: string;
    name: string;
    difficultyColor: string;
    category: string;
    difficulty: string;
    points: number;
  };
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  onClick?: () => void;
  className?: string;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({
  badge,
  size = 'medium',
  showTooltip = true,
  onClick,
  className = ''
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'badge-icon-small';
      case 'large': return 'badge-icon-large';
      default: return 'badge-icon-medium';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      study: '#3b82f6',
      group: '#10b981',
      flashcard: '#8b5cf6',
      note: '#f59e0b',
      social: '#ec4899',
      system: '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: { [key: string]: string } = {
      bronze: 'Бронза',
      silver: 'Серебро',
      gold: 'Золото',
      platinum: 'Платина'
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <div 
      className={`badge-icon ${getSizeClass()} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      data-tooltip={showTooltip ? badge.name : undefined}
    >
      <div 
        className="badge-icon-container"
        style={{
          backgroundColor: `${badge.difficultyColor}20`,
          borderColor: badge.difficultyColor,
          borderWidth: '3px',
          borderStyle: 'solid'
        }}
      >
        <div className="badge-icon-content">
          <span className="badge-icon-emoji">{badge.icon}</span>
        </div>
        
        {/* Индикатор категории */}
        <div 
          className="badge-category-indicator"
          style={{ backgroundColor: getCategoryColor(badge.category) }}
        />
        
        {/* Индикатор сложности */}
        <div 
          className="badge-difficulty-indicator"
          style={{ backgroundColor: badge.difficultyColor }}
        />
      </div>
      
      {/* Информация о бейдже (только для размера large) */}
      {size === 'large' && (
        <div className="badge-info">
          <div className="badge-name">{badge.name}</div>
          <div className="badge-difficulty">
            {getDifficultyLabel(badge.difficulty)}
          </div>
          <div className="badge-points">{badge.points} очков</div>
        </div>
      )}
    </div>
  );
};

export default BadgeIcon;