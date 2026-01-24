// client/src/components/VisualEffectsPreview.tsx
import React, { useState, useEffect } from 'react';
import './VisualEffectsPreview.css';

interface VisualEffectsPreviewProps {
  effect: string;
  size?: 'small' | 'medium' | 'large';
  onEffectChange?: (effect: string) => void;
  availableEffects?: Array<{
    id: string;
    name: string;
    icon: string;
    unlocked: boolean;
    requiresLevel: number;
  }>;
  currentLevel?: number;
}

const VisualEffectsPreview: React.FC<VisualEffectsPreviewProps> = ({
  effect = 'none',
  size = 'medium',
  availableEffects = [],
  currentLevel = 1,
  onEffectChange
}) => {
  const [previewEffect, setPreviewEffect] = useState(effect);

  useEffect(() => {
    setPreviewEffect(effect);
  }, [effect]);

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'preview-small';
      case 'large': return 'preview-large';
      default: return 'preview-medium';
    }
  };

  const getEffectInfo = (effectId: string) => {
    const effects = {
      none: { name: 'Без эффекта', icon: '👤', description: 'Стандартный аватар' },
      sparkle: { name: 'Блеск', icon: '✨', description: 'Мерцающие частицы' },
      glow: { name: 'Свечение', icon: '💫', description: 'Мягкое свечение' },
      fire: { name: 'Огонь', icon: '🔥', description: 'Анимированное пламя' },
      halo: { name: 'Нимб', icon: '😇', description: 'Светящийся нимб' },
      rainbow: { name: 'Радуга', icon: '🌈', description: 'Циклическая смена цветов' },
      pulse: { name: 'Пульсация', icon: '💓', description: 'Пульсирующее свечение' }
    };
    return effects[effectId as keyof typeof effects] || effects.none;
  };

  const handleEffectClick = (effectId: string) => {
    const effectInfo = availableEffects.find(e => e.id === effectId);
    if (effectInfo && (effectInfo.unlocked || currentLevel >= effectInfo.requiresLevel)) {
      setPreviewEffect(effectId);
      if (onEffectChange) {
        onEffectChange(effectId);
      }
    }
  };

  const renderAvatar = () => {
    const { icon } = getEffectInfo(previewEffect);
    return (
      <div className={`avatar-preview ${getSizeClass()} ${previewEffect !== 'none' ? `avatar-${previewEffect}` : ''}`}>
        <div className="avatar-content">
          <span className="avatar-icon">{icon}</span>
        </div>
        {previewEffect !== 'none' && (
          <div className="effect-overlay"></div>
        )}
      </div>
    );
  };

  const renderEffectOptions = () => {
    if (availableEffects.length === 0) return null;

    return (
      <div className="effect-options">
        <h4>Доступные эффекты</h4>
        <div className="effects-grid">
          {availableEffects.map(effectItem => {
            const isUnlocked = effectItem.unlocked || currentLevel >= effectItem.requiresLevel;
            const isSelected = previewEffect === effectItem.id;
            
            return (
              <button
                key={effectItem.id}
                className={`effect-option ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => handleEffectClick(effectItem.id)}
                disabled={!isUnlocked}
                title={!isUnlocked ? `Требуется уровень ${effectItem.requiresLevel}` : effectItem.name}
              >
                <div className="effect-option-icon">
                  {effectItem.icon}
                  {!isUnlocked && <span className="lock-indicator">🔒</span>}
                </div>
                <div className="effect-option-name">{effectItem.name}</div>
                {!isUnlocked && (
                  <div className="effect-requires">Ур. {effectItem.requiresLevel}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="visual-effects-preview">
      <div className="preview-container">
        <h3>Предпросмотр эффектов</h3>
        <div className="preview-content">
          {renderAvatar()}
          <div className="effect-info">
            <div className="effect-name">{getEffectInfo(previewEffect).name}</div>
            <div className="effect-description">{getEffectInfo(previewEffect).description}</div>
            <div className="effect-status">
              {previewEffect !== 'none' ? 'Эффект активен' : 'Без эффекта'}
            </div>
          </div>
        </div>
        {renderEffectOptions()}
      </div>
    </div>
  );
};

export default VisualEffectsPreview;