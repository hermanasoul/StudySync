// client/src/pages/SubjectsPage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { subjectsAPI } from '../services/api';
import Button from '../components/Button'; // Добавлен импорт Button
import './SubjectsPage.css';
import '../App.css';

interface Subject {
  _id: string;
  name: string;
  description: string;
  color: string;
  progress: number;
}

const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await subjectsAPI.getAll();
      if (response.data.success) {
        setSubjects(response.data.subjects);
      } else {
        const mockSubjects: Subject[] = [
          {
            _id: '1',
            name: 'Биология',
            description: 'Изучение живых организмов и их взаимодействия с окружающей средой',
            color: 'green',
            progress: 75
          },
          {
            _id: '2',
            name: 'Химия',
            description: 'Изучение веществ, их свойств и превращений',
            color: 'blue',
            progress: 40
          },
          {
            _id: '3',
            name: 'Математика',
            description: 'Наука о количественных отношениях и пространственных формах',
            color: 'purple',
            progress: 20
          },
          {
            _id: '4',
            name: 'Физика',
            description: 'Изучение фундаментальных законов природы',
            color: 'red',
            progress: 60
          },
          {
            _id: '5',
            name: 'История',
            description: 'Изучение прошлого человечества',
            color: 'yellow',
            progress: 85
          }
        ];
        setSubjects(mockSubjects);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      const mockSubjects: Subject[] = [
        {
          _id: '1',
          name: 'Биология',
          description: 'Изучение живых организмов и их взаимодействия с окружающей средой',
          color: 'green',
          progress: 75
        },
        {
          _id: '2',
          name: 'Химия',
          description: 'Изучение веществ, их свойств и превращений',
          color: 'blue',
          progress: 40
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
          {subjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>У вас пока нет предметов</h3>
              <p>Предметы появятся здесь после добавления</p>
              <Button variant="primary" href="/dashboard"> {/* Заменили на Button */}
                Вернуться на главную
              </Button>
            </div>
          ) : (
            <div className="subjects-grid">
              {subjects.map((subject) => (
                <div key={subject._id} className="subject-card">
                  <div className="subject-header">
                    <h3 className={`subject-title ${subject.color}`}>{subject.name}</h3>
                    <span className="progress-percent">{subject.progress}%</span>
                  </div>
                  <p className="subject-description">{subject.description}</p>
                  <ProgressBar progress={subject.progress} color={subject.color} />
                  <div className="subject-actions button-group"> {/* Добавлен button-group для унифицированного выравнивания */}
                    <Button variant="outline" href={`/subjects/${subject._id}`}>
                      Заметки
                    </Button>
                    <Button variant="primary" href={`/subjects/${subject._id}/flashcards`}>
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
