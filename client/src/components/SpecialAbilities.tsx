// client/src/components/SpecialAbilities.tsx
import React from 'react';
import './SpecialAbilities.css';

interface SpecialAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  requiresLevel: number;
  isActive: boolean;
  benefit: string;
}

interface SpecialAbilitiesProps {
  abilities: SpecialAbility[];
  currentLevel: number;
  onAbilityToggle?: (abilityId: string) => void;
}

const SpecialAbilities: React.FC<SpecialAbilitiesProps> = ({
  abilities,
  currentLevel,
  onAbilityToggle
}) => {
  const getStatusText = (ability: SpecialAbility) => {
    if (ability.unlocked) {
      return ability.isActive ? 'Активно' : 'Доступно';
    } else {
      return `Требуется уровень ${ability.requiresLevel}`;
    }
  };

  const getStatusColor = (ability: SpecialAbility) => {
    if (!ability.unlocked) return '#9ca3af';
    if (ability.isActive) return '#10b981';
    return '#8b5cf6';
  };

  const handleAbilityClick = (ability: SpecialAbility) => {
    if (ability.unlocked && onAbilityToggle) {
      onAbilityToggle(ability.id);
    }
  };

  return (
    <div className="special-abilities">
      <div className="abilities-header">
        <h3>Особые возможности</h3>
        <div className="abilities-stats">
          <span className="stat">
            Разблокировано: {abilities.filter(a => a.unlocked).length}/{abilities.length}
          </span>
          <span className="stat">
            Активные: {abilities.filter(a => a.isActive).length}
          </span>
        </div>
      </div>

      <div className="abilities-grid">
        {abilities.map(ability => {
          const canUnlock = currentLevel >= ability.requiresLevel;
          
          return (
            <div
              key={ability.id}
              className={`ability-card ${ability.unlocked ? 'unlocked' : 'locked'} ${ability.isActive ? 'active' : ''}`}
              onClick={() => handleAbilityClick(ability)}
              style={{ cursor: ability.unlocked ? 'pointer' : 'default' }}
            >
              <div className="ability-header">
                <div className="ability-icon">{ability.icon}</div>
                <div className="ability-status" style={{ color: getStatusColor(ability) }}>
                  {getStatusText(ability)}
                </div>
              </div>
              
              <div className="ability-content">
                <h4 className="ability-name">{ability.name}</h4>
                <p className="ability-description">{ability.description}</p>
                <div className="ability-benefit">
                  <span className="benefit-label">Преимущество:</span>
                  <span className="benefit-text">{ability.benefit}</span>
                </div>
              </div>
              
              <div className="ability-footer">
                {ability.unlocked ? (
                  <div className="ability-actions">
                    {ability.isActive ? (
                      <button className="btn-outline active">Активно</button>
                    ) : (
                      <button className="btn-outline">Активировать</button>
                    )}
                  </div>
                ) : (
                  <div className="ability-requirements">
                    <div className="level-requirement">
                      <span className="requirement-icon">📊</span>
                      <span className="requirement-text">Уровень {ability.requiresLevel}</span>
                    </div>
                    <div className="progress-indicator">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min((currentLevel / ability.requiresLevel) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="progress-text">
                        {currentLevel}/{ability.requiresLevel}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {!ability.unlocked && (
                <div className="ability-lock-overlay">
                  <span className="lock-icon">🔒</span>
                  <span className="lock-text">Разблокируется на уровне {ability.requiresLevel}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpecialAbilities;