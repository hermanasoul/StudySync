import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Функция сохранения профиля будет добавлена позже!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Пароли не совпадают!');
      return;
    }
    alert('Функция смены пароля будет добавлена позже!');
  };

  return (
    <div className="settings-page">
      <Header />
      
      <div className="settings-container">
        <div className="settings-header">
          <h1>Настройки аккаунта</h1>
          <p>Управление вашим профилем и настройками безопасности</p>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h2>Профиль</h2>
            <form onSubmit={handleSaveProfile} className="settings-form">
              <div className="form-group">
                <label htmlFor="name">Имя</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ваше имя"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Сохранить изменения
              </button>
            </form>
          </div>

          <div className="settings-section">
            <h2>Безопасность</h2>
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Текущий пароль</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Текущий пароль"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Новый пароль</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Новый пароль"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Подтвердите новый пароль</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Повторите новый пароль"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Сменить пароль
              </button>
            </form>
          </div>

          <div className="settings-section">
            <h2>Информация об аккаунте</h2>
            <div className="account-info">
              <div className="info-item">
                <span className="info-label">ID пользователя:</span>
                <span className="info-value">{user?.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Дата регистрации:</span>
                <span className="info-value">{new Date().toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Статус:</span>
                <span className="info-value status-active">Активный</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
