import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { friendsAPI, chatsAPI } from '../services/api';
import './NewChatModal.css';

interface Friend {
  id: string;
  name: string;
  avatarUrl: string;
  level: number;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chat: any) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onChatCreated
}) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadFriends();
    }
  }, [isOpen, user]);

  const loadFriends = async () => {
    try {
      const response = await friendsAPI.getFriends();
      if (response.data.success) {
        setFriends(response.data.data.map((friend: any) => ({
          id: friend.userId,
          name: friend.name,
          avatarUrl: friend.avatarUrl,
          level: friend.level
        })));
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleFriendSelect = (friendId: string) => {
    if (chatType === 'direct') {
      setSelectedFriends([friendId]);
    } else {
      setSelectedFriends(prev =>
        prev.includes(friendId)
          ? prev.filter(id => id !== friendId)
          : [...prev, friendId]
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (chatType === 'direct' && selectedFriends.length !== 1) {
      setError('Выберите одного друга для личного чата');
      return;
    }

    if (chatType === 'group' && selectedFriends.length < 1) {
      setError('Выберите хотя бы одного участника для группового чата');
      return;
    }

    if (chatType === 'group' && !groupName.trim()) {
      setError('Введите название группового чата');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await chatsAPI.createChat({
        type: chatType,
        participantIds: selectedFriends,
        name: chatType === 'group' ? groupName.trim() : undefined,
        description: chatType === 'group' ? groupDescription.trim() : undefined
      });

      if (response.data.success) {
        onChatCreated(response.data.data);
        resetForm();
        onClose();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Ошибка создания чата');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFriends([]);
    setChatType('direct');
    setGroupName('');
    setGroupDescription('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content new-chat-modal">
        <div className="modal-header">
          <h2>Новый чат</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="chat-type-selector">
              <button
                type="button"
                className={`type-btn ${chatType === 'direct' ? 'active' : ''}`}
                onClick={() => setChatType('direct')}
              >
                <span className="type-icon">👤</span>
                <span className="type-label">Личный чат</span>
              </button>
              <button
                type="button"
                className={`type-btn ${chatType === 'group' ? 'active' : ''}`}
                onClick={() => setChatType('group')}
              >
                <span className="type-icon">👥</span>
                <span className="type-label">Групповой чат</span>
              </button>
            </div>

            {chatType === 'group' && (
              <div className="group-info">
                <div className="form-group">
                  <label htmlFor="groupName">Название чата *</label>
                  <input
                    id="groupName"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Например: Учебная группа по математике"
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="groupDescription">Описание (необязательно)</label>
                  <textarea
                    id="groupDescription"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Опишите цель чата..."
                    maxLength={500}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="participants-section">
              <h4>Выберите участников</h4>
              <div className="friends-list">
                {friends.length === 0 ? (
                  <div className="no-friends">
                    <div className="no-friends-icon">👥</div>
                    <p>У вас пока нет друзей</p>
                    <p className="hint">Добавьте друзей, чтобы начать общение</p>
                  </div>
                ) : (
                  friends.map(friend => (
                    <div
                      key={friend.id}
                      className={`friend-item ${selectedFriends.includes(friend.id) ? 'selected' : ''}`}
                      onClick={() => handleFriendSelect(friend.id)}
                    >
                      <div className="friend-avatar">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt={friend.name} />
                        ) : (
                          <div className="avatar-text">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="level-badge">{friend.level}</div>
                      </div>
                      <div className="friend-name">{friend.name}</div>
                      {selectedFriends.includes(friend.id) && (
                        <div className="selected-check">✓</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="selected-count">
              Выбрано: {selectedFriends.length} участников
              {chatType === 'direct' && ' (максимум 1)'}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (chatType === 'direct' && selectedFriends.length !== 1) || (chatType === 'group' && selectedFriends.length === 0)}
            >
              {loading ? 'Создание...' : 'Создать чат'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal;