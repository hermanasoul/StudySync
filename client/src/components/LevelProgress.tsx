// client/src/components/LevelProgress.tsx

import React, { useState, useEffect } from 'react';
import './LevelProgress.css';
import { levelsAPI, LevelProgress as LevelProgressType } from '../services/api';

interface LevelProgressProps {
  compact?: boolean;
  showDetails?: boolean;
  onLevelUp?: (newLevel: number) => void;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ 
  compact = false, 
  showDetails = true,
  onLevelUp 
}) => {
  const [progress, setProgress] = useState<LevelProgressType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await levelsAPI.getMyProgress();
      if (response.data.success) {
        setProgress(response.data.progress);
        
        // Проверяем, был ли уровень повышен с последней загрузки
        const lastLevel = localStorage.getItem('last_known_level');
        const currentLevel = response.data.progress.level.toString();
        
        if (lastLevel && parseInt(lastLevel) < response.data.progress.level) {
          if (onLevelUp) {
            onLevelUp(response.data.progress.level);
          }
        }
        
        localStorage.setItem('last_known_level', currentLevel);
      }
    } catch (error) {
      console.error('Error loading level progress:', error);
      setError('Ошибка загрузки прогресса уровня');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 100) return '🌌';
    if (level >= 90) return '💫';
    if (level >= 80) return '🧙';
    if (level >= 70) return '⚡';
    if (level >= 60) return '🌟';
    if (level >= 50) return '👑';
    if (level >= 40) return '🎓';
    if (level >= 30) return '🔍';
    if (level >= 20) return '📚';
    if (level >= 10) return '🌱';
    return '⭐';
  };

  const getLevelColor = (level: number) => {
    if (level >= 100) return '#f97316';
    if (level >= 90) return '#06b6d4';
    if (level >= 80) return '#7c3aed';
    if (level >= 70) return '#ef4444';
    if (level >= 60) return '#ec4899';
    if (level >= 50) return '#f59e0b';
    if (level >= 40) return '#10b981';
    if (level >= 30) return '#8b5cf6';
    if (level >= 20) return '#3b82f6';
    if (level >= 10) return '#6b7280';
    return '#9ca3af';
  };

  if (loading) {
    return (
      <div className="level-progress-loading">
        <div className="loading-spinner"></div>
        <span>Загрузка прогресса...</span>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="level-progress-error">
        <span>{error || 'Не удалось загрузить прогресс'}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="level-progress-compact">
        <div className="level-info-compact">
          <div 
            className="level-icon-compact"
            style={{ backgroundColor: getLevelColor(progress.level) }}
          >
            {getLevelIcon(progress.level)}
          </div>
          <div className="level-details-compact">
            <div className="level-name-compact">
              Уровень {progress.level}
              {progress.currentLevel && (
                <span className="level-title-compact">
                  : {progress.currentLevel.name}
                </span>
              )}
            </div>
            <div className="level-exp-compact">
              {progress.experiencePoints} XP
            </div>
          </div>
        </div>
        <div className="progress-bar-compact">
          <div 
            className="progress-fill-compact"
            style={{ 
              width: `${progress.progressPercentage}%`,
              backgroundColor: getLevelColor(progress.level)
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="level-progress">
      <div className="level-header">
        <div className="level-info">
          <div 
            className="level-icon"
            style={{ 
              backgroundColor: getLevelColor(progress.level),
              borderColor: getLevelColor(progress.level)
            }}
          >
            {progress.currentLevel?.icon || getLevelIcon(progress.level)}
          </div>
          <div className="level-details">
            <h3 className="level-name">
              Уровень {progress.level}
              {progress.currentLevel && (
                <span className="level-title">: {progress.currentLevel.name}</span>
              )}
            </h3>
            <p className="level-description">
              {progress.currentLevel?.description || 'Продолжайте учиться для повышения уровня'}
            </p>
          </div>
        </div>
        
        <div className="level-stats">
          <div className="stat-item">
            <div className="stat-value">{progress.experiencePoints}</div>
            <div className="stat-label">Опыт</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{progress.totalAchievementPoints}</div>
            <div className="stat-label">Очки достижений</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">#{progress.rank}</div>
            <div className="stat-label">Ранг</div>
          </div>
        </div>
      </div>
      
      <div className="progress-section">
        <div className="progress-info">
          <div className="progress-labels">
            <span className="current-level">
              Ур. {progress.level}
            </span>
            <span className="progress-percentage">
              {progress.progressPercentage}%
            </span>
            {progress.nextLevel && (
              <span className="next-level">
                Ур. {progress.nextLevel.level}
              </span>
            )}
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${progress.progressPercentage}%`,
                backgroundColor: getLevelColor(progress.level)
              }}
            />
            <div className="progress-marker" style={{ left: `${progress.progressPercentage}%` }} />
          </div>
          
          <div className="progress-numbers">
            <span className="current-points">
              {progress.experiencePoints} XP
            </span>
            {progress.nextLevel && (
              <span className="points-to-next">
                До след. уровня: {progress.pointsToNextLevel} XP
              </span>
            )}
          </div>
        </div>
        
        {showDetails && progress.nextLevel && (
          <div className="next-level-info">
            <h4>Следующий уровень:</h4>
            <div className="next-level-details">
              <div 
                className="next-level-icon"
                style={{ 
                  backgroundColor: progress.nextLevel.color + '20',
                  borderColor: progress.nextLevel.color
                }}
              >
                {progress.nextLevel.icon}
              </div>
              <div className="next-level-content">
                <h5>Уровень {progress.nextLevel.level}: {progress.nextLevel.name}</h5>
                <p>{progress.nextLevel.description}</p>
                <div className="next-level-requirements">
                  <span className="required-points">
                    Требуется: {progress.nextLevel.requiredPoints} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showDetails && progress.recentLevelUps && progress.recentLevelUps.length > 0 && (
        <div className="recent-level-ups">
          <h4>Последние повышения уровня:</h4>
          <div className="level-up-list">
            {progress.recentLevelUps.slice(0, 3).map((levelUp: any, index: number) => (
              <div key={index} className="level-up-item">
                <div className="level-up-icon">🎉</div>
                <div className="level-up-details">
                  <div className="level-up-title">
                    Уровень {levelUp.details?.oldLevel} → {levelUp.details?.newLevel}
                  </div>
                  <div className="level-up-date">
                    {new Date(levelUp.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelProgress;