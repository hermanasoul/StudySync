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
      setError('Введите email участника');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Фикс: Замени invite на createInvite (из api.ts)
      await groupsAPI.createInvite(groupId, email.trim());
      setSuccess(`Приглашение отправлено на ${email}`);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка отправки приглашения');
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Пригласить в группу "{groupName}"</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          <p>Поделитесь этим кодом приглашения: <strong>{inviteCode}</strong></p>
          <p>Или отправьте приглашение по email:</p>
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="form-group">
              <label htmlFor="email">Email участника *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !email.trim()}
            >
              {loading ? 'Отправка...' : 'Отправить приглашение'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteMembersModal;
