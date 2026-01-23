// client/src/components/AchievementsList.tsx
import React, { useState } from 'react';
import AchievementCard from './AchievementCard';
import './AchievementsList.css';

interface AchievementsListProps {
  achievements: any[];
  loading?: boolean;
  emptyMessage?: string;
  showFilters?: boolean;
  onAchievementClick?: (achievement: any) => void;
}

const AchievementsList: React.FC<AchievementsListProps> = ({
  achievements,
  loading = false,
  emptyMessage = 'Достижения не найдены',
  showFilters = false,
  onAchievementClick
}) => {
  const [filter, setFilter] = useState({
    category: 'all',
    difficulty: 'all',
    unlocked: 'all'
  });

  const categories = [
    { value: 'all', label: 'Все категории' },
    { value: 'study', label: 'Учёба' },
    { value: 'group', label: 'Группы' },
    { value: 'flashcard', label: 'Карточки' },
    { value: 'note', label: 'Заметки' },
    { value: 'social', label: 'Социальное' },
    { value: 'system', label: 'Системное' }
  ];

  const difficulties = [
    { value: 'all', label: 'Все уровни' },
    { value: 'bronze', label: 'Бронза' },
    { value: 'silver', label: 'Серебро' },
    { value: 'gold', label: 'Золото' },
    { value: 'platinum', label: 'Платина' }
  ];

  const unlockedOptions = [
    { value: 'all', label: 'Все' },
    { value: 'true', label: 'Разблокированные' },
    { value: 'false', label: 'Неразблокированные' }
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (filter.category !== 'all' && achievement.category !== filter.category) return false;
    if (filter.difficulty !== 'all' && achievement.difficulty !== filter.difficulty) return false;
    if (filter.unlocked !== 'all') {
      const isUnlocked = achievement.isUnlocked === true;
      if (filter.unlocked === 'true' && !isUnlocked) return false;
      if (filter.unlocked === 'false' && isUnlocked) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="achievements-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка достижений...</p>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="achievements-empty">
        <div className="empty-icon">🏆</div>
        <h3>{emptyMessage}</h3>
        <p>Здесь будут отображаться ваши достижения</p>
      </div>
    );
  }

  return (
    <div className="achievements-list">
      {showFilters && (
        <div className="achievements-filters">
          <div className="filter-group">
            <label htmlFor="category-filter">Категория:</label>
            <select
              id="category-filter"
              value={filter.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="difficulty-filter">Сложность:</label>
            <select
              id="difficulty-filter"
              value={filter.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              className="filter-select"
            >
              {difficulties.map(diff => (
                <option key={diff.value} value={diff.value}>
                  {diff.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="unlocked-filter">Статус:</label>
            <select
              id="unlocked-filter"
              value={filter.unlocked}
              onChange={(e) => handleFilterChange('unlocked', e.target.value)}
              className="filter-select"
            >
              {unlockedOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-stats">
            <span className="filter-count">
              Показано: {filteredAchievements.length} из {achievements.length}
            </span>
          </div>
        </div>
      )}
      
      <div className="achievements-grid">
        {filteredAchievements.map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            showProgress={true}
            onClick={() => onAchievementClick && onAchievementClick(achievement)}
          />
        ))}
      </div>
      
      {filteredAchievements.length === 0 && achievements.length > 0 && (
        <div className="no-results">
          <p>Нет достижений, соответствующих выбранным фильтрам</p>
          <button 
            className="btn-outline"
            onClick={() => setFilter({ category: 'all', difficulty: 'all', unlocked: 'all' })}
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
};

export default AchievementsList;