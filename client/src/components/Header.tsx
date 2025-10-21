import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">StudySync</Link>
        <nav className="nav">
          <Link to="/" className="nav-link">Главная</Link>
          <Link to="/dashboard" className="nav-link">Личный кабинет</Link>
        </nav>
        <div className="header-buttons">
          <Link to="/login" className="btn-login">Вход</Link>
          <Link to="/signup" className="btn-primary">Регистрация</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
