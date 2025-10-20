import React from 'react';
import Header from '../components/Header';
import './HomePage.css';

const HomePage = () => {
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
            <a href="/signup" className="btn btn-filled">
              Начать бесплатно
            </a>
            <a href="/login" className="btn btn-outline">
              Уже есть аккаунт
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
