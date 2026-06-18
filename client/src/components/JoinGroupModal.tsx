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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode.trim()) {
      setError('Введите код приглашения');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await groupsAPI.join(inviteCode.trim());
      onJoinSuccess();
      onClose();
    } catch (err: any) {
      console.error('Join group error:', err);
      setError(err.response?.data?.error || 'Ошибка при присоединении к группе');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '32px 32px 28px',
          maxWidth: '420px',
          width: '90%',
          borderRadius: '12px',
          background: 'var(--modal-bg)',
          border: '1px solid var(--modal-border)',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>Присоединиться к группе</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="join-form" style={{ marginTop: '8px' }}>
          {error && (
            <div 
              className="error-message" 
              style={{
                color: 'var(--accent-danger)',
                fontSize: '14px',
                marginTop: '16px',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <strong>Ошибка:</strong> {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label htmlFor="inviteCode" style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)', fontSize: '14px' }}>
              Код приглашения
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Введите код приглашения..."
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'var(--input-bg)',
                color: 'var(--input-text)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
                textAlign: 'center',
                letterSpacing: '2px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--input-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <div className="input-hint" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
              Код обычно состоит из 6-8 символов (буквы и цифры)
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn-outline"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-primary)',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !inviteCode.trim()}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                border: 'none',
                background: 'var(--accent-primary)',
                color: 'var(--text-inverse)',
                transition: 'background 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => { if (!loading && inviteCode.trim()) e.currentTarget.style.background = 'var(--accent-primary-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-primary)'; }}
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