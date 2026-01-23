// client/src/pages/DashboardPage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Button from '../components/Button';
import './DashboardPage.css';
import '../App.css';

interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  progress: number;
}

const DashboardPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
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

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);
      } else {
        const mockSubjects: Subject[] = [
          {
            id: '1',
            name: 'Биология',
            description: 'Изучение живых организмов',
            color: 'green',
            progress: 75
          },
          {
            id: '2',
            name: 'Химия',
            description: 'Изучение веществ и их свойств',
            color: 'blue',
            progress: 40
          },
          {
            id: '3',
            name: 'Математика',
            description: 'Изучение чисел и вычислений',
            color: 'purple',
            progress: 20
          }
        ];
        setSubjects(mockSubjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      const mockSubjects: Subject[] = [
        {
          id: '1',
          name: 'Биология',
          description: 'Изучение живых организмов',
          color: 'green',
          progress: 75
        },
        {
          id: '2',
          name: 'Химия',
          description: 'Изучение веществ и их свойств',
          color: 'blue',
          progress: 40
        },
        {
          id: '3',
          name: 'Математика',
          description: 'Изучение чисел и вычислений',
          color: 'purple',
          progress: 20
        }
      ];
      setSubjects(mockSubjects);
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
                <div className="subject-actions button-group"> {/* Добавлен button-group для унифицированного выравнивания */}
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
                <div className="stat-info"> {/* Добавлен класс stat-info */}
                  <div className="stat-number">{subjects.length}</div>
                  <div className="stat-label">Предмета</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-info">
                  <div className="stat-number">
                    {Math.round(subjects.reduce((acc, subject) => acc + subject.progress, 0) / subjects.length || 0)}%
                  </div>
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
    </div>
  );
};

export default DashboardPage;
