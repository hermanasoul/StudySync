// client/src/pages/ProfilePage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { levelsAPI, achievementsAPI, badgesAPI, questsAPI, rewardsAPI } from '../services/api';
import Header from '../components/Header';
import LevelProgress from '../components/LevelProgress';
import BadgeGrid from '../components/BadgeGrid';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [badges, setBadges] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [dailyQuests, setDailyQuests] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'quests' | 'rewards' | 'settings'>('overview');

  useEffect(() => {
    if (user) {
      loadUserData();
      updateStreak();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'rewards') {
      loadRewardsData();
    }
  }, [activeTab, user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Загружаем прогресс уровня
      const progressResponse = await levelsAPI.getMyProgress();
      if (progressResponse.data.success) {
        setProgress(progressResponse.data.progress);
      }
      
      // Загружаем последние достижения
      const achievementsResponse = await achievementsAPI.getMy();
      if (achievementsResponse.data.success) {
        const unlocked = achievementsResponse.data.achievements
          .filter((ua: any) => ua.isUnlocked)
          .sort((a: any, b: any) => 
            new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
          )
          .slice(0, 5);
        setRecentAchievements(unlocked);
      }
      
      // Загружаем бейджи
      const badgesResponse = await badgesAPI.getMyBadges();
      if (badgesResponse.data.success) {
        setBadges(badgesResponse.data.badges);
      }
      
      // Загружаем серию
      const streakResponse = await badgesAPI.getStreak();
      if (streakResponse.data.success) {
        setStreak(streakResponse.data.streak);
      }
      
      // Загружаем ежедневные задания
      const questsResponse = await questsAPI.getMyQuests();
      if (questsResponse.data.success) {
        const daily = questsResponse.data.quests
          .filter((q: any) => q.quest.type === 'daily')
          .slice(0, 3);
        setDailyQuests(daily);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRewardsData = async () => {
    try {
      const rewardsResponse = await rewardsAPI.getAvailable();
      if (rewardsResponse.data.success) {
        setRewards(rewardsResponse.data.rewards);
      }
    } catch (error) {
      console.error('Error loading rewards data:', error);
    }
  };

  const updateStreak = async () => {
    try {
      await badgesAPI.updateStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const handleBadgeClick = (badge: any) => {
    console.log('Badge clicked:', badge);
    // Можно открыть модальное окно с деталями бейджа
  };

  const handleApplyTheme = async (theme: string) => {
    try {
      await rewardsAPI.applyTheme(theme);
      loadRewardsData();
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  };

  const handleApplyAvatarEffect = async (effect: string) => {
    try {
      await rewardsAPI.applyAvatarEffect(effect);
      loadRewardsData();
    } catch (error) {
      console.error('Error applying avatar effect:', error);
    }
  };

  const handleApplyBadgeFrame = async (frame: string) => {
    try {
      await rewardsAPI.applyBadgeFrame(frame);
      loadRewardsData();
    } catch (error) {
      console.error('Error applying badge frame:', error);
    }
  };

  const handleApplyProfileBackground = async (background: string) => {
    try {
      await rewardsAPI.applyProfileBackground(background);
      loadRewardsData();
    } catch (error) {
      console.error('Error applying profile background:', error);
    }
  };

  const handleResetDefaults = async () => {
    try {
      await rewardsAPI.resetDefaults();
      loadRewardsData();
    } catch (error) {
      console.error('Error resetting defaults:', error);
    }
  };

  const getEffectIcon = (effectId: string) => {
    switch (effectId) {
      case 'sparkle': return '✨';
      case 'glow': return '💫';
      case 'fire': return '🔥';
      case 'halo': return '😇';
      case 'rainbow': return '🌈';
      case 'pulse': return '💓';
      default: return '👤';
    }
  };

  const getFrameIcon = (frameId: string) => {
    switch (frameId) {
      case 'bronze-frame': return '🥉';
      case 'silver-frame': return '🥈';
      case 'gold-frame': return '🥇';
      case 'platinum-frame': return '🏆';
      case 'crystal-frame': return '💎';
      default: return '🖼️';
    }
  };

  const getBackgroundIcon = (backgroundId: string) => {
    switch (backgroundId) {
      case 'particles': return '✨';
      case 'gradient-animated': return '🌊';
      case 'stars': return '⭐';
      case 'geometric': return '🔶';
      default: return '🎨';
    }
  };

  const getAbilityIcon = (abilityId: string) => {
    switch (abilityId) {
      case 'daily_quests': return '📅';
      case 'weekly_quests': return '📆';
      case 'monthly_quests': return '🗓️';
      case 'custom_themes': return '🎨';
      case 'priority_support': return '🚀';
      case 'advanced_analytics': return '📊';
      case 'unlimited_groups': return '👥';
      default: return '🎁';
    }
  };

  const renderOverview = () => (
    <>
      {/* Секция прогресса уровня */}
      {progress && (
        <div className="profile-section">
          <div className="section-header">
            <h3>⭐ Прогресс уровня</h3>
            <a href="/levels" className="view-all-link">
              Подробнее →
            </a>
          </div>
          <LevelProgress compact={true} />
        </div>
      )}
      
      {/* Секция серии */}
      {streak && (
        <div className="profile-section">
          <div className="section-header">
            <h3>🔥 Серия активности</h3>
            <div className="streak-info">
              <span className="streak-current">{streak.current} дней</span>
              <span className="streak-longest">Лучшее: {streak.longest} дней</span>
            </div>
          </div>
          <div className="streak-container">
            <div className="streak-visual">
              {Array.from({ length: 7 }).map((_, index) => (
                <div 
                  key={index}
                  className={`streak-day ${index < streak.current ? 'active' : 'inactive'}`}
                  title={`День ${index + 1}`}
                >
                  {index < streak.current ? '🔥' : '○'}
                </div>
              ))}
            </div>
            <p className="streak-description">
              Заходите каждый день, чтобы сохранить серию и получать бонусы!
            </p>
          </div>
        </div>
      )}
      
      {/* Секция отображаемых бейджей */}
      {badges && badges.displayed && badges.displayed.length > 0 && (
        <div className="profile-section">
          <div className="section-header">
            <h3>🏆 Мои бейджи</h3>
            <button 
              className="btn-outline"
              onClick={() => setActiveTab('badges')}
            >
              Управление →
            </button>
          </div>
          <div className="displayed-badges">
            {badges.displayed.map((badge: any) => (
              <div key={badge.achievementId} className="displayed-badge">
                <div 
                  className="badge-icon-large"
                  style={{
                    backgroundColor: `${badge.difficultyColor}20`,
                    borderColor: badge.difficultyColor
                  }}
                  title={`${badge.name} (${badge.points} очков)`}
                >
                  {badge.icon}
                </div>
                <div className="badge-tooltip">
                  <strong>{badge.name}</strong>
                  <span>{badge.points} очков</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Секция ежедневных заданий */}
      {dailyQuests.length > 0 && (
        <div className="profile-section">
          <div className="section-header">
            <h3>🎯 Ежедневные задания</h3>
            <button 
              className="btn-outline"
              onClick={() => setActiveTab('quests')}
            >
              Все задания →
            </button>
          </div>
          <div className="daily-quests">
            {dailyQuests.map((quest: any) => (
              <div key={quest._id} className="daily-quest">
                <div className="quest-icon">{quest.quest.icon}</div>
                <div className="quest-info">
                  <div className="quest-name">{quest.quest.name}</div>
                  <div className="quest-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{
                          width: `${(quest.progress / quest.requiredProgress) * 100}%`,
                          backgroundColor: quest.quest.difficultyColor
                        }}
                      />
                    </div>
                    <span className="progress-text">
                      {quest.progress}/{quest.requiredProgress}
                    </span>
                  </div>
                  {quest.isCompleted && !quest.claimed && (
                    <button className="claim-btn">
                      Получить {quest.quest.points} очков
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const renderBadgesTab = () => (
    <div className="profile-section">
      <div className="section-header">
        <h3>🏆 Моя коллекция бейджей</h3>
        <div className="badge-stats">
          <span className="stat-item">
            <strong>{badges?.stats?.total || 0}</strong> всего
          </span>
          <span className="stat-item">
            <strong>{badges?.stats?.displayedCount || 0}</strong> отображается
          </span>
        </div>
      </div>
      
      {badges ? (
        <>
          <div className="badge-collection-stats">
            <div className="stat-card">
              <h4>По сложности</h4>
              <div className="difficulty-stats">
                {Object.entries(badges.stats?.byDifficulty || {}).map(([difficulty, count]) => (
                  <div key={difficulty} className="difficulty-stat">
                    <span className="difficulty-label">{difficulty}</span>
                    <span className="difficulty-count">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="stat-card">
              <h4>По категориям</h4>
              <div className="category-stats">
                {Object.entries(badges.stats?.byCategory || {}).map(([category, count]) => (
                  <div key={category} className="category-stat">
                    <span className="category-label">{category}</span>
                    <span className="category-count">{(count as any[]).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <BadgeGrid
            badges={badges.all || []}
            title="Все бейджи"
            onBadgeClick={handleBadgeClick}
            editable={true}
          />
        </>
      ) : (
        <div className="loading">Загрузка бейджей...</div>
      )}
    </div>
  );

  const renderQuestsTab = () => (
    <div className="profile-section">
      <div className="section-header">
        <h3>🎯 Задания и квесты</h3>
        <button className="btn-primary" onClick={handleGenerateDailyQuests}>
          Новые задания
        </button>
      </div>
      {/* Здесь будет компонент квестов */}
      <div className="coming-soon">
        <p>Система заданий скоро будет доступна!</p>
      </div>
    </div>
  );

  const renderRewardsTab = () => (
    <div className="profile-section">
      <div className="section-header">
        <h3>🎁 Награды и визуальные эффекты</h3>
        <div className="rewards-stats">
          <span className="stat-item">
            <strong>{rewards?.stats?.totalUnlocked || 0}</strong> разблокировано
          </span>
          <span className="stat-item">
            Уровень <strong>{rewards?.stats?.level || 1}</strong>
          </span>
        </div>
      </div>
      
      {rewards ? (
        <div className="rewards-container">
          {/* Активные награды */}
          <div className="active-rewards">
            <h4>Активные настройки</h4>
            <div className="active-rewards-grid">
              <div className="active-reward-item">
                <div className="active-reward-label">Тема:</div>
                <div className="active-reward-value">
                  {rewards.active.theme === 'default' ? 'Стандартная' : 
                   rewards.active.theme === 'dark' ? 'Темная' :
                   rewards.active.theme === 'premium' ? 'Премиум' :
                   rewards.active.theme === 'gradient' ? 'Градиент' :
                   rewards.active.theme === 'nebula' ? 'Туманность' :
                   rewards.active.theme === 'sunset' ? 'Закат' :
                   rewards.active.theme === 'forest' ? 'Лес' :
                   rewards.active.theme === 'ocean' ? 'Океан' : rewards.active.theme}
                </div>
              </div>
              <div className="active-reward-item">
                <div className="active-reward-label">Эффект аватара:</div>
                <div className="active-reward-value">
                  {rewards.active.avatarEffect === 'none' ? 'Без эффекта' :
                   rewards.active.avatarEffect === 'sparkle' ? 'Блеск' :
                   rewards.active.avatarEffect === 'glow' ? 'Свечение' :
                   rewards.active.avatarEffect === 'fire' ? 'Огонь' :
                   rewards.active.avatarEffect === 'halo' ? 'Нимб' :
                   rewards.active.avatarEffect === 'rainbow' ? 'Радуга' :
                   rewards.active.avatarEffect === 'pulse' ? 'Пульсация' : rewards.active.avatarEffect}
                </div>
              </div>
              <div className="active-reward-item">
                <div className="active-reward-label">Рамка бейджей:</div>
                <div className="active-reward-value">
                  {rewards.active.badgeFrame === 'none' ? 'Без рамки' :
                   rewards.active.badgeFrame === 'bronze-frame' ? 'Бронзовая' :
                   rewards.active.badgeFrame === 'silver-frame' ? 'Серебряная' :
                   rewards.active.badgeFrame === 'gold-frame' ? 'Золотая' :
                   rewards.active.badgeFrame === 'platinum-frame' ? 'Платиновая' :
                   rewards.active.badgeFrame === 'crystal-frame' ? 'Кристальная' : rewards.active.badgeFrame}
                </div>
              </div>
              <div className="active-reward-item">
                <div className="active-reward-label">Фон профиля:</div>
                <div className="active-reward-value">
                  {rewards.active.profileBackground === 'default' ? 'Стандартный' :
                   rewards.active.profileBackground === 'particles' ? 'Частицы' :
                   rewards.active.profileBackground === 'gradient-animated' ? 'Анимированный градиент' :
                   rewards.active.profileBackground === 'stars' ? 'Звезды' :
                   rewards.active.profileBackground === 'geometric' ? 'Геометрия' : rewards.active.profileBackground}
                </div>
              </div>
            </div>
            <button 
              className="btn-outline reset-btn"
              onClick={handleResetDefaults}
            >
              Сбросить к стандартным
            </button>
          </div>
          
          {/* Темы профиля */}
          <div className="reward-category">
            <h4>Темы профиля</h4>
            <div className="reward-items">
              {rewards.available.themes.map((theme: any) => (
                <div key={theme.id} className={`reward-item ${theme.unlocked ? 'unlocked' : 'locked'}`}>
                  <div 
                    className="reward-icon" 
                    style={{ 
                      backgroundColor: theme.color,
                      background: theme.id === 'gradient' ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' :
                                 theme.id === 'nebula' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)' :
                                 theme.id === 'sunset' ? 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)' :
                                 theme.id === 'forest' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                 theme.id === 'ocean' ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' : theme.color
                    }}
                  ></div>
                  <div className="reward-info">
                    <div className="reward-name">{theme.name}</div>
                    <div className="reward-description">
                      {theme.unlocked ? 'Разблокировано' : `Требуется уровень ${theme.requiresLevel}`}
                    </div>
                  </div>
                  {theme.unlocked && rewards.active.theme === theme.id && (
                    <div className="reward-applied">Применено</div>
                  )}
                  {theme.unlocked && rewards.active.theme !== theme.id && (
                    <button 
                      className="btn-outline"
                      onClick={() => handleApplyTheme(theme.id)}
                    >
                      Применить
                    </button>
                  )}
                  {!theme.unlocked && (
                    <div className="reward-locked">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Эффекты аватара */}
          <div className="reward-category">
            <h4>Эффекты аватара</h4>
            <div className="reward-items">
              {rewards.available.avatarEffects.map((effect: any) => (
                <div key={effect.id} className={`reward-item ${effect.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="reward-icon">{getEffectIcon(effect.id)}</div>
                  <div className="reward-info">
                    <div className="reward-name">{effect.name}</div>
                    <div className="reward-description">
                      {effect.unlocked ? 'Разблокировано' : `Требуется уровень ${effect.requiresLevel}`}
                    </div>
                  </div>
                  {effect.unlocked && rewards.active.avatarEffect === effect.id && (
                    <div className="reward-applied">Применено</div>
                  )}
                  {effect.unlocked && rewards.active.avatarEffect !== effect.id && (
                    <button 
                      className="btn-outline"
                      onClick={() => handleApplyAvatarEffect(effect.id)}
                    >
                      Применить
                    </button>
                  )}
                  {!effect.unlocked && (
                    <div className="reward-locked">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Рамки для бейджей */}
          <div className="reward-category">
            <h4>Рамки для бейджей</h4>
            <div className="reward-items">
              {rewards.available.badgeFrames.map((frame: any) => (
                <div key={frame.id} className={`reward-item ${frame.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="reward-icon">{getFrameIcon(frame.id)}</div>
                  <div className="reward-info">
                    <div className="reward-name">{frame.name}</div>
                    <div className="reward-description">
                      {frame.unlocked ? 'Разблокировано' : `Требуется уровень ${frame.requiresLevel}`}
                    </div>
                  </div>
                  {frame.unlocked && rewards.active.badgeFrame === frame.id && (
                    <div className="reward-applied">Применено</div>
                  )}
                  {frame.unlocked && rewards.active.badgeFrame !== frame.id && (
                    <button 
                      className="btn-outline"
                      onClick={() => handleApplyBadgeFrame(frame.id)}
                    >
                      Применить
                    </button>
                  )}
                  {!frame.unlocked && (
                    <div className="reward-locked">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Фоны профиля */}
          <div className="reward-category">
            <h4>Фоны профиля</h4>
            <div className="reward-items">
              {rewards.available.profileBackgrounds.map((background: any) => (
                <div key={background.id} className={`reward-item ${background.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="reward-icon">{getBackgroundIcon(background.id)}</div>
                  <div className="reward-info">
                    <div className="reward-name">{background.name}</div>
                    <div className="reward-description">
                      {background.unlocked ? 'Разблокировано' : `Требуется уровень ${background.requiresLevel}`}
                    </div>
                  </div>
                  {background.unlocked && rewards.active.profileBackground === background.id && (
                    <div className="reward-applied">Применено</div>
                  )}
                  {background.unlocked && rewards.active.profileBackground !== background.id && (
                    <button 
                      className="btn-outline"
                      onClick={() => handleApplyProfileBackground(background.id)}
                    >
                      Применить
                    </button>
                  )}
                  {!background.unlocked && (
                    <div className="reward-locked">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Особые возможности */}
          <div className="reward-category">
            <h4>Особые возможности</h4>
            <div className="reward-items">
              {rewards.available.specialAbilities.map((ability: any) => (
                <div key={ability.id} className={`reward-item ${ability.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="reward-icon">{getAbilityIcon(ability.id)}</div>
                  <div className="reward-info">
                    <div className="reward-name">{ability.name}</div>
                    <div className="reward-description">
                      {ability.unlocked ? 'Разблокировано' : `Требуется уровень ${ability.requiresLevel}`}
                    </div>
                  </div>
                  {ability.unlocked && (
                    <div className="reward-applied">Активно</div>
                  )}
                  {!ability.unlocked && (
                    <div className="reward-locked">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="loading">Загрузка наград...</div>
      )}
    </div>
  );

  const handleGenerateDailyQuests = async () => {
    try {
      await questsAPI.generateDaily();
      loadUserData();
    } catch (error) {
      console.error('Error generating daily quests:', error);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <Header />
        <div className="error">Пожалуйста, войдите в систему.</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header />
      <div className="profile-container">
        <div className="profile-header">
          <h1>Профиль пользователя</h1>
          <p>Управление вашей учетной записью</p>
        </div>
        
        {/* Вкладки профиля */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Обзор
          </button>
          <button
            className={`profile-tab ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            Бейджи
          </button>
          <button
            className={`profile-tab ${activeTab === 'quests' ? 'active' : ''}`}
            onClick={() => setActiveTab('quests')}
          >
            Задания
          </button>
          <button
            className={`profile-tab ${activeTab === 'rewards' ? 'active' : ''}`}
            onClick={() => setActiveTab('rewards')}
          >
            Награды
          </button>
          <button
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Настройки
          </button>
        </div>
        
        <div className="profile-content">
          {/* Основная информация профиля */}
          <div className="profile-card">
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="profile-details">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                
                <div className="profile-stats-quick">
                  {progress && (
                    <div className="stat-quick">
                      <div className="stat-icon">⭐</div>
                      <div className="stat-info">
                        <div className="stat-value">Уровень {progress.level}</div>
                        <div className="stat-label">{progress.experiencePoints} опыта</div>
                      </div>
                    </div>
                  )}
                  
                  {badges && (
                    <div className="stat-quick">
                      <div className="stat-icon">🏆</div>
                      <div className="stat-info">
                        <div className="stat-value">{badges.stats?.total || 0} бейджей</div>
                        <div className="stat-label">{badges.stats?.displayedCount || 0} отображается</div>
                      </div>
                    </div>
                  )}
                  
                  {streak && (
                    <div className="stat-quick">
                      <div className="stat-icon">🔥</div>
                      <div className="stat-info">
                        <div className="stat-value">Серия {streak.current} дней</div>
                        <div className="stat-label">Лучшее: {streak.longest} дней</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="profile-actions">
              <button className="btn-primary">Редактировать профиль</button>
              <button className="btn-outline">Сменить пароль</button>
            </div>
          </div>
          
          {/* Контент вкладок */}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'badges' && renderBadgesTab()}
          {activeTab === 'quests' && renderQuestsTab()}
          {activeTab === 'rewards' && renderRewardsTab()}
          {activeTab === 'settings' && (
            <div className="profile-section">
              <h3>Настройки профиля</h3>
              <p>Скоро появится!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;