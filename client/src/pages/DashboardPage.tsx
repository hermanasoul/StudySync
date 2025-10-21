import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { subjectsAPI } from '../services/api';
import './DashboardPage.css';

interface Subject {
  id: number;
  name: string;
  description: string;
  color: string;
  progress: number;
}

const DashboardPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const mockSubjects: Subject[] = [
        {
          id: 1,
          name: 'Биология',
          description: 'Изучение живых организмов',
          color: 'green',
          progress: 75
        },
        {
          id: 2,
          name: 'Химия',
          description: 'Изучение веществ и их свойств',
          color: 'blue',
          progress: 40
        },
        {
          id: 3,
          name: 'Математика',
          description: 'Изучение чисел и вычислений',
          color: 'purple',
          progress: 20
        }
      ];
      setSubjects(mockSubjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar: React.FC<{ progress: number; color: string }> = ({ progress, color }) => (
    <div className="progress-container">
      <div 
        className={`progress-bar ${color}`}
        style={{ width: `${progress}%` }}
      ></div>
      <span className="progress-text">{progress}%</span>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        <Header />
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Header />
      
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Личный кабинет</h1>
          <p>Ваш прогресс по предметам</p>
        </div>

        <div className="subjects-grid">
          {subjects.map((subject) => (
            <div key={subject.id} className="subject-card">
              <div className="subject-header">
                <h3 className={`subject-title ${subject.color}`}>{subject.name}</h3>
                <span className="progress-percent">{subject.progress}%</span>
              </div>
              
              <p className="subject-description">{subject.description}</p>
              
              <ProgressBar progress={subject.progress} color={subject.color} />
              
              <div className="subject-actions">
                <Link to={`/subjects/${subject.id}`} className="btn-outline">
                  Заметки
                </Link>
                <Link to={`/subjects/${subject.id}/flashcards`} className="btn-primary">
                  Карточки
                </Link>
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
                <div className="stat-number">3</div>
                <div className="stat-label">Предмета</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-number">45%</div>
                <div className="stat-label">Общий прогресс</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-number">12</div>
                <div className="stat-label">Изучено тем</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
