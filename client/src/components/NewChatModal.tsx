import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatsAPI, friendsAPI } from '../services/api';
import './NewChatModal.css';

interface Friend {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      setSelectedFriend('');
      setGroupName('');
      setError('');
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      const res = await friendsAPI.getFriends();
      if (res.data.success) {
        setFriends(res.data.friends.filter((f: Friend) => f._id !== user?.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (chatType === 'direct' && !selectedFriend) {
      setError('Выберите друга');
      return;
    }
    if (chatType === 'group' && !groupName.trim()) {
      setError('Введите название группы');
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        type: chatType,
        participantIds: chatType === 'direct' ? [selectedFriend] : [],
      };
      if (chatType === 'group') {
        body.name = groupName.trim();
      }

      const res = await chatsAPI.createChat(body);
      if (res.data.success && res.data.chat) {
        onChatCreated(res.data.chat._id);
        onClose();
      } else {
        setError('Не удалось создать чат');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания чата');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Новый чат</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message"><strong>Ошибка:</strong> {error}</div>}
          <div className="form-group">
            <label>Тип чата</label>
            <select value={chatType} onChange={(e) => setChatType(e.target.value as any)}>
              <option value="direct">Личный</option>
              <option value="group">Групповой</option>
            </select>
          </div>
          {chatType === 'direct' ? (
            <div className="form-group">
              <label>Друг</label>
              {friends.length === 0 ? (
                <p>Нет доступных друзей</p>
              ) : (
                <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
                  <option value="">Выберите друга</option>
                  {friends.map(friend => (
                    <option key={friend._id} value={friend._id}>
                      {friend.name} ({friend.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label>Название группы</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Введите название группы"
              />
            </div>
          )}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-outline" disabled={loading}>Отмена</button>
            <button type="submit" className="btn-primary" disabled={loading}>Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal;