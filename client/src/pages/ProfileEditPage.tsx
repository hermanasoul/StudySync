import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../services/api'; // Используем импорт по умолчанию
import './ProfileEditPage.css';

const ProfileEditPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(user?.avatarUrl || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Если выбран новый аватар, сначала загружаем его
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await api.post('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Обновляем имя и email
      const response = await api.put('/users/profile', { name, email });
      if (response.data.success) {
        updateUser(response.data.user);
        setSuccessMessage('Профиль обновлён!');
        setTimeout(() => navigate('/profile'), 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-edit-page">
        <Header />
        <div className="page-with-header">
          <div className="error-message">Пожалуйста, войдите в систему.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit-page">
      <Header />
      <div className="page-with-header">
        <div className="profile-edit-container">
          <div className="breadcrumb">
            <Link to="/profile">Профиль</Link> / <span>Редактировать профиль</span>
          </div>

          <h1>Редактировать профиль</h1>

          <form onSubmit={handleSubmit} className="profile-edit-form">
            {/* Аватар */}
            <div className="avatar-section">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Аватар" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="avatar-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                  Загрузить фото
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleRemoveAvatar}>
                  Удалить
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* Поля ввода */}
            <div className="form-group">
              <label htmlFor="name">Имя</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <Link to="/profile" className="btn btn-outline">Отмена</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditPage;