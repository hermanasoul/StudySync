import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="home-page">
        <Header />
        
        <div className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Добро пожаловать, <span className="highlight">{user.name}</span>!
            </h1>
            <p className="hero-subtitle">
              Продолжайте обучение в StudySync. Создавайте заметки, изучайте карточки 
              и отслеживайте свой прогресс.
            </p>
            <div className="button-group">
              <Link to="/dashboard" className="btn btn-filled">
                Перейти в личный кабинет
              </Link>
              <Link to="/subjects/1/flashcards" className="btn btn-outline">
                Начать учиться
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <Header />
      
      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Учитесь вместе - <span className="highlight">эффективнее</span>
          </h1>
          <p className="hero-subtitle">
            Создавайте группы, делитесь заметками и готовьтесь к экзаменам вместе. 
            StudySync делает обучение социальным и продуктивным.
          </p>
          <div className="button-group">
            <Link to="/signup" className="btn btn-filled">
              Начать бесплатно
            </Link>
            <Link to="/login" className="btn btn-outline">
              Уже есть аккаунт
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
