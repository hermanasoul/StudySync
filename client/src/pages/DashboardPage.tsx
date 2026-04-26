// client/src/pages/DashboardPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Button from '../components/Button';
import LevelProgress from '../components/LevelProgress';
import './DashboardPage.css';
import '../App.css';
import { achievementsAPI, levelsAPI } from '../services/api';

interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  progress: number;
}

interface RecentAchievement {
  id: string;
  achievement: {
    name: string;
    icon: string;
    difficultyColor: string;
    points: number;
  };
  unlockedAt: string;
}

const DashboardPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [levelProgress, setLevelProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('studysync_token');
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };
    return await fetch(`http://localhost:5000/api${endpoint}`, config);
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/subjects');
      const data = await response.json();
      if (data.success) {
        const rawSubjects = data.subjects || [];
        console.log('Первый предмет (raw):', rawSubjects[0]); // <-- ключевой лог
        const mapped = rawSubjects.map((s: any) => {
          // Приоритет _id, иначе id, иначе пустая строка (чтобы избежать undefined)
          const id = s._id || s.id || '';
          return {
            id,
            name: s.name || 'Без названия',
            description: s.description || '',
            color: s.color || 'blue',
            progress: s.progress || 0,
          };
        });
        console.log('ID предметов:', mapped.map((s: any) => s.id));
        setSubjects(mapped);
      } else {
        setSubjects([]);
      }

      const levelResponse = await levelsAPI.getMyProgress();
      if (levelResponse.data.success) {
        setLevelProgress(levelResponse.data.progress);
      }

      const achievResponse = await achievementsAPI.getMy();
      if (achievResponse.data.success) {
        const unlocked = achievResponse.data.achievements
          .filter((ua: any) => ua.isUnlocked)
          .sort((a: any, b: any) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
          .slice(0, 4)
          .map((ua: any) => ({
            id: ua.id,
            achievement: {
              name: ua.achievement.name,
              icon: ua.achievement.icon,
              difficultyColor: ua.achievement.difficultyColor,
              points: ua.achievement.points,
            },
            unlockedAt: ua.unlockedAt,
          }));
        setRecentAchievements(unlocked);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const ProgressBar: React.FC<{ progress: number; color: string }> = ({ progress, color }) => (
    <div className="progress-container">
      <div className={`progress-bar ${color}`} style={{ width: `${progress}%` }}></div>
      <span className="progress-text">{progress}%</span>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        <Header />
        <div className="page-with-header">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Header />
      <div className="page-with-header">
        <div className="dashboard-container animate-fade-in-up">
          <div className="dashboard-header">
            <h1>Личный кабинет</h1>
            <p>Ваш прогресс по предметам</p>
          </div>

          {levelProgress && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>⭐ Мой уровень</h2>
                <a href="/levels" className="view-all-link">Подробнее →</a>
              </div>
              <LevelProgress compact={true} />
            </div>
          )}

          {recentAchievements.length > 0 && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>🏆 Последние достижения</h2>
                <Link to="/achievements" className="view-all-link">Все достижения →</Link>
              </div>
              <div className="achievements-preview">
                {recentAchievements.map((ua) => (
                  <div key={ua.id} className="achievement-preview-item">
                    <div className="achievement-preview-icon" style={{ backgroundColor: ua.achievement.difficultyColor + '20', borderColor: ua.achievement.difficultyColor }}>
                      {ua.achievement.icon}
                    </div>
                    <div className="achievement-preview-info">
                      <h4>{ua.achievement.name}</h4>
                      <p className="achievement-date">{new Date(ua.unlockedAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="achievement-points-badge">+{ua.achievement.points}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="subjects-grid">
            {subjects.map((subject, index) => (
              <div key={subject.id} className={`subject-card animate-fade-in-up delay-${index * 100}`}>
                <div className="subject-header">
                  <h3 className={`subject-title ${subject.color}`}>{subject.name}</h3>
                  <span className="progress-percent">{subject.progress}%</span>
                </div>
                <p className="subject-description">{subject.description}</p>
                <ProgressBar progress={subject.progress} color={subject.color} />
                <div className="subject-actions button-group">
                  <Button variant="outline" href={`/subjects/${subject.id}`}>
                    Заметки
                  </Button>
                  <Button variant="primary" href={`/subjects/${subject.id}/flashcards`}>
                    Карточки
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="quick-stats">
            <h2>Быстрая статистика</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <div className="stat-number">{subjects.length}</div>
                  <div className="stat-label">Предмета</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-number">
                    {Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length || 0)}%
                  </div>
                  <div className="stat-label">Общий прогресс</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-info">
                  <div className="stat-number">{levelProgress ? levelProgress.level : '1'}</div>
                  <div className="stat-label">Уровень</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-info">
                  <div className="stat-number">{recentAchievements.length}</div>
                  <div className="stat-label">Достижений</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;