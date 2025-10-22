import React, { useState } from 'react';
import { groupsAPI } from '../services/api';
import './InviteMembersModal.css';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  inviteCode: string;
}

const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  inviteCode
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Введите email пользователя');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await groupsAPI.invite(groupId, email.trim());
      setSuccess(`Приглашение отправлено на ${email}`);
      setEmail('');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при отправке приглашения');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess('');
    onClose();
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert('Код приглашения скопирован в буфер обмена!');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Пригласить в группу</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="invite-content">
          <div className="invite-method">
            <h3>Способ 1: Отправить приглашение по email</h3>
            <form onSubmit={handleSubmit} className="invite-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-group">
                <label htmlFor="email">Email пользователя</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Отправка...' : 'Отправить приглашение'}
              </button>
            </form>
          </div>

          <div className="invite-divider">
            <span>или</span>
          </div>

          <div className="invite-method">
            <h3>Способ 2: Поделиться кодом приглашения</h3>
            <div className="invite-code-section">
              <div className="invite-code-display">
                {inviteCode}
              </div>
              <button 
                className="btn-outline copy-btn"
                onClick={copyInviteCode}
              >
                📋 Копировать код
              </button>
              <p className="invite-hint">
                Поделитесь этим кодом с друзьями, чтобы они могли присоединиться к группе
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteMembersModal;
