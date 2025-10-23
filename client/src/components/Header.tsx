import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import './Header.css';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-top">
          <Link to="/" className="logo">StudySync</Link>
        </div>
        <div className="header-bottom">
          <nav className="nav">
            <Link to="/dashboard" className="nav-link">Главная</Link>
            <Link to="/subjects" className="nav-link">Предметы</Link>
            <Link to="/groups" className="nav-link">Группы</Link>
            <Link to="/feedback" className="nav-link">Отзывы</Link>
            <Link to="/help" className="nav-link">Помощь</Link>
          </nav>
          <div className="header-buttons button-group"> {/* Добавлен button-group для унифицированного выравнивания */}
            {user ? (
              <>
                <span className="user-name">Привет, {user.name}!</span>
                <Button variant="success" size="small" href="/profile">
                  Профиль
                </Button>
                <Button variant="danger" size="small" onClick={handleLogout}>
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="small" href="/login">
                  Войти
                </Button>
                <Button variant="primary" size="small" href="/signup">
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
