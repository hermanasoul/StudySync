import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import './NotesPage.css';

const NotesPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();

  return (
    <div className="notes-page">
      <Header />
      
      <div className="notes-container">
        <div className="page-header">
          <h1>Заметки по предмету</h1>
          <p>Здесь будут ваши заметки и материалы</p>
        </div>

        <div className="notes-content">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Заметок пока нет</h3>
            <p>Создайте свою первую заметку для этого предмета</p>
            <button className="btn-primary">Создать заметку</button>
          </div>
        </div>

        <div className="page-actions">
          <Link to="/dashboard" className="btn-outline">
            ← Назад к предметам
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
