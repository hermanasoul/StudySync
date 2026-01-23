// client/src/components/LevelUpNotification.tsx

import React, { useState, useEffect } from 'react';
import './LevelUpNotification.css';

interface LevelUpNotificationProps {
  levelUp: {
    oldLevel: number;
    newLevel: number;
    levelName: string;
    icon: string;
    color: string;
    unlocks: any;
  };
  onClose?: () => void;
}

const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({ 
  levelUp, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [showUnlocks, setShowUnlocks] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUnlocks(true);
    }, 1000);

    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
    };
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 500);
  };

  const getLevelUpMessage = () => {
    const levelDiff = levelUp.newLevel - levelUp.oldLevel;
    
    if (levelDiff === 1) {
      return 'Вы повысили уровень!';
    } else if (levelDiff <= 3) {
      return 'Вы повысили несколько уровней сразу!';
    } else {
      return 'Невероятно! Вы поднялись на несколько уровней!';
    }
  };

  const getUnlocksMessage = () => {
    const unlocks = levelUp.unlocks || {};
    
    if (unlocks.badge) {
      return `Новый бейдж: ${unlocks.badge}`;
    }
    
    return 'Новые возможности разблокированы!';
  };

  if (!isVisible) return null;

  return (
    <div className={`level-up-notification ${isExiting ? 'exiting' : ''}`}>
      <div 
        className="level-up-notification-content"
        style={{ 
          background: `linear-gradient(135deg, ${levelUp.color}20, ${levelUp.color}10)`,
          borderLeft: `4px solid ${levelUp.color}`
        }}
      >
        <button className="close-notification-btn" onClick={handleClose}>
          ×
        </button>
        
        <div className="level-up-header">
          <div 
            className="level-up-icon-badge"
            style={{ 
              backgroundColor: levelUp.color,
              boxShadow: `0 0 20px ${levelUp.color}40`
            }}
          >
            <span className="level-up-icon">{levelUp.icon}</span>
          </div>
          <div className="level-up-title">
            <h3>🎉 Уровень повышен!</h3>
            <h4>{getLevelUpMessage()}</h4>
          </div>
        </div>
        
        <div className="level-up-progression">
          <div className="old-level">
            <span className="level-number">{levelUp.oldLevel}</span>
            <span className="level-label">Старый уровень</span>
          </div>
          
          <div className="level-arrow">
            <div className="arrow-line" />
            <div className="arrow-head">→</div>
          </div>
          
          <div className="new-level">
            <span 
              className="level-number"
              style={{ color: levelUp.color }}
            >
              {levelUp.newLevel}
            </span>
            <span className="level-label">{levelUp.levelName}</span>
          </div>
        </div>
        
        {showUnlocks && (
          <div className="level-up-unlocks">
            <div className="unlocks-header">
              <h5>🎁 Новые возможности:</h5>
            </div>
            <div className="unlocks-content">
              <p>{getUnlocksMessage()}</p>
              {levelUp.unlocks?.badge && (
                <div className="unlocked-badge">
                  <span className="badge-icon">🏅</span>
                  <span className="badge-name">Бейдж: {levelUp.unlocks.badge}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="level-up-fireworks">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i}
              className="firework"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1}s`,
                backgroundColor: [
                  '#FFD700', '#FF6B6B', '#4ECDC4', '#FFA500', '#9B5DE5'
                ][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
        
        <div className="level-up-actions">
          <button 
            className="continue-btn"
            onClick={handleClose}
          >
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
};

export default LevelUpNotification;