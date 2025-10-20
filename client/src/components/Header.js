import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <a href="/" className="logo">StudySync</a>
        <nav className="nav">
          <a href="/" className="nav-link">Главная</a>
          <a href="/dashboard" className="nav-link">Личный кабинет</a>
        </nav>
        <div className="header-buttons">
          <a href="/login" className="btn-login">Вход</a>
          <a href="/signup" className="btn-primary">Регистрация</a>
        </div>
      </div>
    </header>
  );
};

export default Header;
