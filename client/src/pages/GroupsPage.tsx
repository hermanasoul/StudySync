import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CreateGroupModal from '../components/CreateGroupModal';
import JoinGroupModal from '../components/JoinGroupModal';
import { groupsAPI } from '../services/api';
import './GroupsPage.css';

interface Group {
  _id: string;
  name: string;
  description: string;
  subjectId: {
    _id: string;
    name: string;
    color: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
    };
    role: string;
  }>;
  isPublic: boolean;
  inviteCode: string;
  memberCount: number;
}

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getMyGroups();
      if (response.data.success) {
        const groupsWithCount = response.data.groups.map((group: any) => ({
          ...group,
          memberCount: group.members.length
        }));
        setGroups(groupsWithCount);
      } else {
        // Mock данные для демонстрации
        const mockGroups: Group[] = [
          {
            _id: '1',
            name: 'Биология для начинающих',
            description: 'Изучаем основы биологии вместе',
            subjectId: {
              _id: '1',
              name: 'Биология',
              color: 'green'
            },
            createdBy: {
              _id: '1',
              name: 'Анна',
              email: 'anna@example.com'
            },
            members: [
              {
                user: {
                  _id: '1',
                  name: 'Анна',
                  email: 'anna@example.com'
                },
                role: 'owner'
              },
              {
                user: {
                  _id: '2',
                  name: 'Иван',
                  email: 'ivan@example.com'
                },
                role: 'member'
              }
            ],
            isPublic: true,
            inviteCode: 'ABC123',
            memberCount: 2
          }
        ];
        setGroups(mockGroups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      // Fallback на mock данные
      const mockGroups: Group[] = [
        {
          _id: '1',
          name: 'Биология для начинающих',
          description: 'Изучаем основы биологии вместе',
          subjectId: {
            _id: '1',
            name: 'Биология',
            color: 'green'
          },
          createdBy: {
            _id: '1',
            name: 'Анна',
            email: 'anna@example.com'
          },
          members: [
            {
              user: {
                _id: '1',
                name: 'Анна',
                email: 'anna@example.com'
              },
              role: 'owner'
            },
            {
              user: {
                _id: '2', 
                name: 'Иван',
                email: 'ivan@example.com'
              },
              role: 'member'
            }
          ],
          isPublic: true,
          inviteCode: 'ABC123',
          memberCount: 2
        }
      ];
      setGroups(mockGroups);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: 'Владелец', color: '#ef4444' },
      admin: { label: 'Админ', color: '#f59e0b' },
      member: { label: 'Участник', color: '#3b82f6' }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    return (
      <span 
        className="role-badge"
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="groups-page">
        <Header />
        <div className="loading">Загрузка групп...</div>
      </div>
    );
  }

  return (
    <div className="groups-page">
      <Header />
      
      <div className="groups-container">
        <div className="page-header">
          <h1>Учебные группы</h1>
          <p>Совместное обучение с друзьями и коллегами</p>
        </div>

        <div className="groups-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Создать группу
          </button>
          <button 
            className="btn-outline"
            onClick={() => setShowJoinModal(true)}
          >
            🔗 Присоединиться по коду
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="no-groups">
            <div className="no-groups-icon">👥</div>
            <h3>У вас пока нет групп</h3>
            <p>Создайте свою первую группу для совместного обучения</p>
            <button 
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Создать группу
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => (
              <div key={group._id} className="group-card">
                <div className="group-header">
                  <div className="group-info">
                    <h3 className="group-name">{group.name}</h3>
                    <span className={`subject-tag ${group.subjectId.color}`}>
                      {group.subjectId.name}
                    </span>
                  </div>
                  <div className="group-meta">
                    {getRoleBadge(group.members.find(m => m.user._id === group.createdBy._id)?.role || 'member')}
                    {group.isPublic && <span className="public-badge">Публичная</span>}
                  </div>
                </div>

                <p className="group-description">
                  {group.description || 'Описание отсутствует'}
                </p>

                <div className="group-stats">
                  <div className="stat">
                    <span className="stat-number">{group.memberCount}</span>
                    <span className="stat-label">участников</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">
                      {group.members.find(m => m.user._id === group.createdBy._id)?.role === 'owner' ? 'Владелец' : 'Участник'}
                    </span>
                    <span className="stat-label">ваша роль</span>
                  </div>
                </div>

                <div className="group-actions">
                  <Link to={`/groups/${group._id}`} className="btn-primary">
                    Открыть
                  </Link>
                  <div className="invite-code">
                    Код: <strong>{group.inviteCode}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={loadGroups}
      />

      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinSuccess={loadGroups}
      />
    </div>
  );
};

export default GroupsPage;
