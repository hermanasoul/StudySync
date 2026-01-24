// client/src/components/LevelProgress.tsx
import React, { useState, useEffect } from 'react';
import './LevelProgress.css';

interface LevelProgressProps {
  compact?: boolean;
  showDetails?: boolean;
  currentLevel?: number;
  experiencePoints?: number;
  nextLevel?: number;
  progressPercentage?: number;
  pointsToNextLevel?: number;
  unlocks?: any;
}

const LevelProgress: React.FC<LevelProgressProps> = ({
  compact = false,
  showDetails = true,
  currentLevel = 1,
  experiencePoints = 0,
  nextLevel = 2,
  progressPercentage = 0,
  pointsToNextLevel = 100,
  unlocks = {}
}) => {
  const [nextUnlock, setNextUnlock] = useState<any>(null);
  const [unlockedItems, setUnlockedItems] = useState<any[]>([]);

  useEffect(() => {
    // Симуляция получения разблокированных предметов
    const mockUnlocked = [];
    if (currentLevel >= 5) mockUnlocked.push({ type: 'theme', name: 'Темная тема' });
    if (currentLevel >= 10) mockUnlocked.push({ type: 'effect', name: 'Эффект огня' });
    if (currentLevel >= 15) mockUnlocked.push({ type: 'ability', name: 'Расширенная аналитика' });
    
    setUnlockedItems(mockUnlocked);

    // Определяем следующую награду
    if (currentLevel < 5) {
      setNextUnlock({ level: 5, reward: 'Темная тема', type: 'theme' });
    } else if (currentLevel < 10) {
      setNextUnlock({ level: 10, reward: 'Эффект огня', type: 'effect' });
    } else if (currentLevel < 15) {
      setNextUnlock({ level: 15, reward: 'Расширенная аналитика', type: 'ability' });
    } else if (currentLevel < 20) {
      setNextUnlock({ level: 20, reward: 'Премиум тема', type: 'theme' });
    } else {
      setNextUnlock(null);
    }
  }, [currentLevel]);

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'theme': return '🎨';
      case 'effect': return '✨';
      case 'ability': return '🚀';
      case 'frame': return '🖼️';
      default: return '🎁';
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'theme': return '#8b5cf6';
      case 'effect': return '#f59e0b';
      case 'ability': return '#10b981';
      case 'frame': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (compact) {
    return (
      <div className="level-progress-compact">
        <div className="progress-header">
          <div className="level-info">
            <span className="level-label">Уровень {currentLevel}</span>
            <span className="xp-info">{experiencePoints} опыта</span>
          </div>
          <div className="next-level">
            До уровня {nextLevel}: {pointsToNextLevel} XP
          </div>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="progress-footer">
          <div className="progress-percentage">{Math.round(progressPercentage)}%</div>
          {nextUnlock && (
            <div className="next-reward">
              <span className="reward-icon">{getRewardIcon(nextUnlock.type)}</span>
              <span className="reward-text">Уровень {nextUnlock.level}: {nextUnlock.reward}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="level-progress">
      <div className="progress-container">
        <div className="level-display">
          <div className="current-level">
            <div className="level-number">{currentLevel}</div>
            <div className="level-label">Текущий уровень</div>
          </div>
          
          <div className="progress-section">
            <div className="progress-header">
              <div className="xp-info">
                <span className="xp-current">{experiencePoints}</span>
                <span className="xp-separator">/</span>
                <span className="xp-next">{experiencePoints + pointsToNextLevel}</span>
                <span className="xp-label">опыта</span>
              </div>
              <div className="xp-to-next">
                До следующего уровня: {pointsToNextLevel} XP
              </div>
            </div>
            
            <div className="progress-bar-large">
              <div 
                className="progress-fill-large"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="progress-info">
              <span className="progress-percentage-large">{Math.round(progressPercentage)}%</span>
              <span className="next-level-info">Уровень {nextLevel}</span>
            </div>
          </div>
          
          <div className="next-level-preview">
            <div className="next-level-number">{nextLevel}</div>
            <div className="next-level-label">Следующий уровень</div>
          </div>
        </div>

        {showDetails && (
          <div className="level-details">
            <div className="unlocked-rewards">
              <h4>Разблокированные награды</h4>
              {unlockedItems.length > 0 ? (
                <div className="rewards-list">
                  {unlockedItems.map((item, index) => (
                    <div key={index} className="reward-item-small">
                      <span 
                        className="reward-icon-small"
                        style={{ backgroundColor: getRewardColor(item.type) + '20', color: getRewardColor(item.type) }}
                      >
                        {getRewardIcon(item.type)}
                      </span>
                      <span className="reward-name">{item.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-rewards">Нет разблокированных наград</div>
              )}
            </div>
            
            {nextUnlock && (
              <div className="next-reward-info">
                <h4>Следующая награда</h4>
                <div className="next-reward-card">
                  <div 
                    className="reward-icon-large"
                    style={{ 
                      backgroundColor: getRewardColor(nextUnlock.type) + '20',
                      borderColor: getRewardColor(nextUnlock.type)
                    }}
                  >
                    {getRewardIcon(nextUnlock.type)}
                  </div>
                  <div className="reward-details">
                    <div className="reward-level">Уровень {nextUnlock.level}</div>
                    <div className="reward-name-large">{nextUnlock.reward}</div>
                    <div className="reward-progress">
                      <div className="progress-bar-small">
                        <div 
                          className="progress-fill-small"
                          style={{ 
                            width: `${Math.min((currentLevel / nextUnlock.level) * 100, 100)}%`,
                            backgroundColor: getRewardColor(nextUnlock.type)
                          }}
                        />
                      </div>
                      <span className="level-progress-text">
                        {currentLevel}/{nextUnlock.level}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="level-stats">
              <div className="stat-item">
                <div className="stat-number">{currentLevel}</div>
                <div className="stat-label">Текущий уровень</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{experiencePoints}</div>
                <div className="stat-label">Всего опыта</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{pointsToNextLevel}</div>
                <div className="stat-label">XP до след. уровня</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LevelProgress;