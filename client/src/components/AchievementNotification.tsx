// client/src/components/AchievementNotification.tsx

import React, { useState, useEffect } from 'react';
import './AchievementNotification.css';

interface AchievementNotificationProps {
  achievement: {
    name: string;
    icon: string;
    description: string;
    points: number;
    difficulty: string;
  };
  onClose?: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({ 
  achievement, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getDifficultyColor = () => {
    switch (achievement.difficulty) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
      default: return '#cd7f32';
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <div className={`achievement-notification ${isExiting ? 'exiting' : ''}`}>
      <div 
        className="achievement-notification-content"
        style={{ borderLeft: `4px solid ${getDifficultyColor()}` }}
      >
        <button className="close-notification-btn" onClick={handleClose}>
          ×
        </button>
        
        <div className="achievement-header">
          <div 
            className="achievement-icon-badge"
            style={{ backgroundColor: getDifficultyColor() + '20' }}
          >
            <span className="achievement-icon">{achievement.icon}</span>
          </div>
          <div className="achievement-title">
            <h3>🎉 Новое достижение!</h3>
            <h4>{achievement.name}</h4>
          </div>
        </div>
        
        <p className="achievement-description">{achievement.description}</p>
        
        <div className="achievement-footer">
          <span className="achievement-points">
            +{achievement.points} очков
          </span>
          <span 
            className="achievement-difficulty"
            style={{ color: getDifficultyColor() }}
          >
            {achievement.difficulty === 'bronze' && 'Бронза'}
            {achievement.difficulty === 'silver' && 'Серебро'}
            {achievement.difficulty === 'gold' && 'Золото'}
            {achievement.difficulty === 'platinum' && 'Платина'}
          </span>
        </div>
        
        <div className="confetti">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: [
                  '#FFD700', '#FF6B6B', '#4ECDC4', '#FFA500', '#9B5DE5'
                ][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementNotification;