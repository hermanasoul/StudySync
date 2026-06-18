import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import api from '../services/api';
import './ChangePasswordPage.css';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);

    try {
      await api.put('/users/change-password', { oldPassword, newPassword });
      setSuccessMessage('Пароль успешно изменён!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <Header />
      <div className="page-with-header">
        <div className="change-password-container">
          <div className="breadcrumb">
            <Link to="/profile">Профиль</Link> / <span>Сменить пароль</span>
          </div>

          <h1>Сменить пароль</h1>

          <form onSubmit={handleSubmit} className="change-password-form">
            <div className="form-group">
              <label htmlFor="oldPassword">Текущий пароль</label>
              <input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Новый пароль</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Подтвердите новый пароль</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сменить пароль'}
              </button>
              <Link to="/profile" className="btn btn-outline">Отмена</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;