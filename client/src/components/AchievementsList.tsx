import React from 'react';
import AchievementCard from './AchievementCard';
import { Achievement } from '../services/api';
import './AchievementsList.css';

interface AchievementsListProps {
  achievements: Achievement[];
  loading?: boolean;
  emptyMessage?: string;
  showFilters?: boolean;
  onAchievementClick?: (achievement: Achievement) => void;
}

const AchievementsList: React.FC<AchievementsListProps> = ({
  achievements,
  loading = false,
  emptyMessage = 'Нет достижений',
  showFilters = false,
  onAchievementClick
}) => {
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [filterDifficulty, setFilterDifficulty] = React.useState('all');
  const [filterUnlocked, setFilterUnlocked] = React.useState('all');

  const categories = ['all', 'study', 'group', 'flashcard', 'note', 'social', 'system'];
  const difficulties = ['all', 'bronze', 'silver', 'gold', 'platinum'];

  const filteredAchievements = achievements.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterDifficulty !== 'all' && a.difficulty !== filterDifficulty) return false;
    if (filterUnlocked === 'unlocked' && !a.isUnlocked) return false;
    if (filterUnlocked === 'locked' && a.isUnlocked) return false;
    return true;
  });

  if (loading) {
    return <div className="loading">Загрузка достижений...</div>;
  }

  if (achievements.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="achievements-list-container">
      {showFilters && (
        <div className="achievements-filters">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Все категории' : cat}
              </option>
            ))}
          </select>
          <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
            {difficulties.map(diff => (
              <option key={diff} value={diff}>
                {diff === 'all' ? 'Все сложности' : diff}
              </option>
            ))}
          </select>
          <select value={filterUnlocked} onChange={e => setFilterUnlocked(e.target.value)}>
            <option value="all">Все</option>
            <option value="unlocked">Разблокированные</option>
            <option value="locked">Заблокированные</option>
          </select>
        </div>
      )}

      <div className="achievements-grid">
        {filteredAchievements.map(achievement => (
          <AchievementCard
            key={achievement.id}
            id={achievement.id}
            name={achievement.name}
            description={achievement.description}
            icon={achievement.icon}
            difficulty={achievement.difficulty as 'bronze' | 'silver' | 'gold' | 'platinum'}
            difficultyColor={achievement.difficultyColor}
            category={achievement.category}
            points={achievement.points}
            progress={achievement.progress}
            isUnlocked={achievement.isUnlocked}
            unlockedAt={achievement.unlockedAt}
            onClick={() => onAchievementClick && onAchievementClick(achievement)}
          />
        ))}
      </div>
    </div>
  );
};

export default AchievementsList;