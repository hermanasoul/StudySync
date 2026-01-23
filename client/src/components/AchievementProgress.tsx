// client/src/components/AchievementProgress.tsx
import React from 'react';
import './AchievementProgress.css';

interface AchievementProgressProps {
  progress: {
    unlocked: number;
    total: number;
    totalPoints: number;
    byCategory: {
      [key: string]: {
        unlocked: number;
        total: number;
      };
    };
    byDifficulty: {
      [key: string]: {
        unlocked: number;
        total: number;
      };
    };
  };
}

const AchievementProgress: React.FC<AchievementProgressProps> = ({ progress }) => {
  const overallProgress = progress.total > 0 ? (progress.unlocked / progress.total) * 100 : 0;
  
  const categories = [
    { key: 'study', label: 'Учёба', color: '#3b82f6' },
    { key: 'group', label: 'Группы', color: '#10b981' },
    { key: 'flashcard', label: 'Карточки', color: '#8b5cf6' },
    { key: 'note', label: 'Заметки', color: '#f59e0b' },
    { key: 'social', label: 'Социальное', color: '#ec4899' },
    { key: 'system', label: 'Системное', color: '#6b7280' }
  ];
  
  const difficulties = [
    { key: 'bronze', label: 'Бронза', color: '#cd7f32' },
    { key: 'silver', label: 'Серебро', color: '#c0c0c0' },
    { key: 'gold', label: 'Золото', color: '#ffd700' },
    { key: 'platinum', label: 'Платина', color: '#e5e4e2' }
  ];

  return (
    <div className="achievement-progress-container">
      <div className="progress-overview">
        <div className="overview-header">
          <h3>Прогресс достижений</h3>
          <span className="overview-percentage">{Math.round(overallProgress)}%</span>
        </div>
        
        <div className="progress-bar-large">
          <div 
            className="progress-fill-large"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        
        <div className="overview-stats">
          <div className="stat">
            <div className="stat-number">{progress.unlocked}</div>
            <div className="stat-label">Разблокировано</div>
          </div>
          <div className="stat">
            <div className="stat-number">{progress.total}</div>
            <div className="stat-label">Всего</div>
          </div>
          <div className="stat">
            <div className="stat-number">{progress.totalPoints}</div>
            <div className="stat-label">Очков</div>
          </div>
        </div>
      </div>
      
      <div className="progress-details">
        <div className="category-progress">
          <h4>По категориям</h4>
          <div className="category-list">
            {categories.map(category => {
              const catProgress = progress.byCategory[category.key] || { unlocked: 0, total: 0 };
              const percentage = catProgress.total > 0 ? (catProgress.unlocked / catProgress.total) * 100 : 0;
              
              return (
                <div key={category.key} className="category-item">
                  <div className="category-info">
                    <span 
                      className="category-color" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="category-name">{category.label}</span>
                    <span className="category-count">
                      {catProgress.unlocked}/{catProgress.total}
                    </span>
                  </div>
                  <div className="category-progress-bar">
                    <div 
                      className="category-progress-fill"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: category.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="difficulty-progress">
          <h4>По сложности</h4>
          <div className="difficulty-list">
            {difficulties.map(difficulty => {
              const diffProgress = progress.byDifficulty[difficulty.key] || { unlocked: 0, total: 0 };
              const percentage = diffProgress.total > 0 ? (diffProgress.unlocked / diffProgress.total) * 100 : 0;
              
              return (
                <div key={difficulty.key} className="difficulty-item">
                  <div className="difficulty-info">
                    <span 
                      className="difficulty-color" 
                      style={{ 
                        color: difficulty.color,
                        backgroundColor: difficulty.color + '20'
                      }}
                    >
                      {difficulty.label.charAt(0)}
                    </span>
                    <span className="difficulty-name">{difficulty.label}</span>
                    <span className="difficulty-count">
                      {diffProgress.unlocked}/{diffProgress.total}
                    </span>
                  </div>
                  <div className="difficulty-progress-bar">
                    <div 
                      className="difficulty-progress-fill"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: difficulty.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementProgress;