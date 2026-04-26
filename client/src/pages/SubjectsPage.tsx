// client/src/pages/SubjectsPage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { subjectsAPI } from '../services/api';
import Button from '../components/Button';
import './SubjectsPage.css';
import '../App.css';

interface Subject {
  id: string;  // теперь используем id (как отдаёт сервер)
  name: string;
  description: string;
  color: string;
  progress: number;
}

const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await subjectsAPI.getAll();
      if (response.data.success) {
        const serverSubjects = response.data.subjects.map((s: any) => ({
          id: s.id || s._id,   // id в приоритете, так как сервер даёт id
          name: s.name,
          description: s.description || '',
          color: s.color || 'blue',
          progress: s.progress || 0,
        }));
        setSubjects(serverSubjects);
      } else {
        setError('Не удалось загрузить предметы.');
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setError('Ошибка подключения к серверу.');
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
      <div className="subjects-page">
        <Header />
        <div className="page-with-header">
          <div className="loading">Загрузка предметов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="subjects-page">
      <Header />
      <div className="page-with-header">
        <div className="subjects-container">
          <div className="page-header">
            <h1>Мои предметы</h1>
            <p>Ваш прогресс по всем предметам</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError('')} className="error-close">×</button>
            </div>
          )}

          {subjects.length === 0 && !loading ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>У вас пока нет предметов</h3>
              <p>Предметы появятся здесь после добавления</p>
              <Button variant="primary" href="/dashboard">
                Вернуться на главную
              </Button>
            </div>
          ) : (
            <div className="subjects-grid">
              {subjects.map((subject) => (
                <div key={subject.id} className="subject-card">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectsPage;