import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="home-page">
      <Header />
      <main className="home-main">
        <div className="hero-section">
          <h1>Добро пожаловать{user?.name ? `, ${user.name}!` : ''} в StudySync</h1>
          <p>Эффективно изучайте предметы с помощью интерактивных карточек и группового обучения</p>
          <div className="hero-buttons">
            <Link
              to={user ? '/dashboard' : '/login'}
              className="hero-btn-primary"
            >
              {user ? 'Перейти в личный кабинет' : 'Начать учиться'}
            </Link>
            <Link
              to="/groups"
              className="hero-btn-outline"
            >
              Присоединиться к группе
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
