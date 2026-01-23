// client/src/components/InviteMembersModal.tsx

import React, { useState } from 'react';
import { groupsAPI, achievementsAPI } from '../services/api';
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
      await groupsAPI.createInvite(groupId, email.trim());
      
      // Проверяем достижения
      try {
        // Первое приглашение
        await achievementsAPI.check('FIRST_INVITE');
        
        // Достижение за несколько приглашений
        // В реальном приложении нужно отслеживать количество принятых приглашений
        await achievementsAPI.check('MENTOR_5', 20); // 20% прогресса (1 из 5)
      } catch (achievementError) {
        console.error('Error checking achievements:', achievementError);
        // Не прерываем отправку приглашения из-за ошибки достижений
      }

      setSuccess(`Приглашение отправлено на ${email}`);
      setEmail('');
    } catch (err: any) {
      console.error('Invite error:', err);
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
    setSuccess('Код скопирован в буфер обмена!');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Пригласить в группу</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="invite-content">
          <div className="invite-section">
            <h3>Код приглашения</h3>
            <div className="invite-code-display" onClick={copyInviteCode}>
              {inviteCode}
            </div>
            <p className="invite-hint">Нажмите на код, чтобы скопировать</p>
          </div>

          <div className="divider">или</div>

          <form onSubmit={handleSubmit} className="invite-form">
            <h3>Отправить приглашение по email</h3>
            
            {error && (
              <div className="error-message">
                <strong>Ошибка:</strong> {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email пользователя</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите email..."
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="btn-outline"
              >
                Закрыть
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !email.trim()}
              >
                {loading ? 'Отправка...' : 'Отправить приглашение'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteMembersModal;