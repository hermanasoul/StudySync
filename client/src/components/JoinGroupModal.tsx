import React, { useState } from 'react';
import { groupsAPI } from '../services/api';
import './JoinGroupModal.css';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
}

const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  onJoinSuccess
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Введите код приглашения');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await groupsAPI.join(inviteCode.trim().toUpperCase());
      
      if (response.data.success) {
        setSuccess('Вы успешно присоединились к группе!');
        setInviteCode('');
        setTimeout(() => {
          onJoinSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при присоединении к группе');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content join-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Присоединиться к группе</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="inviteCode">Код приглашения</label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Введите код приглашения..."
              className="invite-input"
              maxLength={6}
              required
            />
            <p className="input-hint">
              Код приглашения состоит из 6 символов (буквы и цифры)
            </p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-outline"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Присоединение...' : 'Присоединиться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinGroupModal;
