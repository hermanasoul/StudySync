import React from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="profile-page">
        <Header />
        <div className="error">Пожалуйста, войдите в систему.</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header />
      <div className="profile-container">
        <div className="profile-header">
          <h1>Профиль пользователя</h1>
          <p>Управление вашей учетной записью</p>
        </div>
        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'} {/* Safe check */}
              </div>
              <div className="profile-details">
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
              </div>
            </div>
            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Предметов</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Групп</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Карточек</div>
              </div>
            </div>
            <div className="profile-actions">
              <button className="btn-primary">Редактировать профиль</button>
              <button className="btn-outline">Сменить пароль</button>
            </div>
          </div>
          <div className="coming-soon">
            <h3>Скоро появится</h3>
            <p>Управление уведомлениями, настройками темы и многое другое.</p>
            <ul>
              <li>Настройки уведомлений</li>
              <li>Изменение темы приложения</li>
              <li>Экспорт данных</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
