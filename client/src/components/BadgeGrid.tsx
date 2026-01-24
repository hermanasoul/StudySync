// client/src/components/BadgeGrid.tsx
import React, { useState } from 'react';
import BadgeIcon from './BadgeIcon';
import './BadgeGrid.css';

interface BadgeGridProps {
  badges: any[];
  category?: string;
  title?: string;
  emptyMessage?: string;
  onBadgeClick?: (badge: any) => void;
  editable?: boolean;
  maxBadges?: number;
}

const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  category = 'all',
  title = 'Бейджи',
  emptyMessage = 'Нет бейджей для отображения',
  onBadgeClick,
  editable = false,
  maxBadges = 12
}) => {
  const [selectedCategory, setSelectedCategory] = useState(category);

  const categories = [
    { value: 'all', label: 'Все', color: '#6b7280' },
    { value: 'study', label: 'Учёба', color: '#3b82f6' },
    { value: 'group', label: 'Группы', color: '#10b981' },
    { value: 'flashcard', label: 'Карточки', color: '#8b5cf6' },
    { value: 'note', label: 'Заметки', color: '#f59e0b' },
    { value: 'social', label: 'Социальные', color: '#ec4899' },
    { value: 'system', label: 'Системные', color: '#6b7280' }
  ];

  const filteredBadges = badges.filter(badge => {
    if (selectedCategory === 'all') return true;
    return badge.category === selectedCategory;
  }).slice(0, maxBadges);

  const getCategoryStats = () => {
    const stats: { [key: string]: number } = {};
    categories.forEach(cat => {
      if (cat.value !== 'all') {
        stats[cat.value] = badges.filter(b => b.category === cat.value).length;
      }
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  return (
    <div className="badge-grid-container">
      <div className="badge-grid-header">
        <h3 className="badge-grid-title">{title}</h3>
        <span className="badge-count">
          {filteredBadges.length} из {badges.length}
        </span>
      </div>

      {/* Фильтры по категориям */}
      <div className="badge-category-filters">
        {categories.map(cat => (
          <button
            key={cat.value}
            className={`category-filter-btn ${selectedCategory === cat.value ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.value)}
            style={{
              backgroundColor: selectedCategory === cat.value ? cat.color : '#f3f4f6',
              color: selectedCategory === cat.value ? 'white' : '#374151'
            }}
          >
            {cat.label}
            {cat.value !== 'all' && (
              <span className="category-count">
                {categoryStats[cat.value] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Сетка бейджей */}
      {filteredBadges.length > 0 ? (
        <div className="badge-grid">
          {filteredBadges.map(badge => (
            <div key={badge.id} className="badge-grid-item">
              <BadgeIcon
                badge={badge}
                size="medium"
                showTooltip={true}
                onClick={() => onBadgeClick && onBadgeClick(badge)}
              />
              
              {editable && (
                <div className="badge-actions">
                  <button 
                    className="badge-action-btn"
                    onClick={() => console.log('Edit badge:', badge.id)}
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="badge-grid-empty">
          <div className="empty-icon">🏆</div>
          <h4>{emptyMessage}</h4>
          <p>Получайте достижения, чтобы пополнить коллекцию</p>
        </div>
      )}

      {filteredBadges.length < badges.length && maxBadges < badges.length && (
        <div className="badge-grid-footer">
          <button className="view-more-btn">
            Показать все бейджи ({badges.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default BadgeGrid;