import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">StudySync</Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Главная</Link>
          {user && <Link to="/dashboard" className="nav-link">Личный кабинет</Link>}
          {user && <Link to="/settings" className="nav-link">Настройки</Link>}
        </nav>
        <div className="header-buttons">
          {user ? (
            <div className="user-menu">
              <span className="user-name">Привет, {user.name}!</span>
              <button onClick={handleLogout} className="btn-logout">
                Выйти
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-login">Вход</Link>
              <Link to="/signup" className="btn-primary">Регистрация</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
