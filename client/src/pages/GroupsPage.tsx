import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CreateGroupModal from '../components/CreateGroupModal';
import JoinGroupModal from '../components/JoinGroupModal';
import Button from '../components/Button';
import { groupsAPI } from '../services/api';
import './GroupsPage.css';
import '../App.css';

interface Group {
  _id: string;
  name: string;
  description: string;
  subjectId: {
    _id: string;
    name: string;
    color: string;
  } | null;
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
      const response = await groupsAPI.getMy();
      if (response.data.success) {
        const groupsWithCount = response.data.groups.map((group: any) => ({
          ...group,
          memberCount: group.members.length
        }));
        setGroups(groupsWithCount);
      } else {
        const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
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
              name: currentUser.name || 'Администратор',
              email: currentUser.email || 'admin@example.com'
            },
            members: [
              {
                user: {
                  _id: '1',
                  name: currentUser.name || 'Администратор',
                  email: currentUser.email || 'admin@example.com'
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
      const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
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
            name: currentUser.name || 'Администратор',
            email: currentUser.email || 'admin@example.com'
          },
          members: [
            {
              user: {
                _id: '1',
                name: currentUser.name || 'Администратор',
                email: currentUser.email || 'admin@example.com'
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

  const getUserRoleInGroup = (group: Group): string => {
    const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
    const member = group.members.find(m => m.user._id === currentUser.id);
    return member?.role || 'member';
  };

  if (loading) {
    return (
      <div className="groups-page">
        <Header />
        <div className="page-with-header">
          <div className="loading">Загрузка групп...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="groups-page">
      <Header />
      <div className="page-with-header">
        <div className="groups-container">
          <div className="page-header">
            <h1>Учебные группы</h1>
            <p>Совместное обучение с друзьями и коллегами</p>
          </div>
          <div className="groups-actions button-group">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              + Создать группу
            </Button>
            <Button variant="success" className="btn-auto" onClick={() => setShowJoinModal(true)}>
              🔗 Присоединиться по коду
            </Button>
          </div>
          {groups.length === 0 ? (
            <div className="no-groups">
              <div className="no-groups-icon">👥</div>
              <h3>У вас пока нет групп</h3>
              <p>Создайте свою первую группу для совместного обучения</p>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                Создать группу
              </Button>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((group) => (
                <div key={group._id} className="group-card">
                  <div className="group-header">
                    <div className="group-info">
                      <h3 className="group-name">{group.name}</h3>
                      {group.subjectId && group.subjectId.name && (
                        <span className={`subject-tag ${group.subjectId.color || 'blue'}`}>
                          {group.subjectId.name}
                        </span>
                      )}
                    </div>
                    <div className="group-meta">
                      {getRoleBadge(getUserRoleInGroup(group))}
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
                        {getUserRoleInGroup(group) === 'owner' ? 'Владелец' :
                         getUserRoleInGroup(group) === 'admin' ? 'Админ' : 'Участник'}
                      </span>
                      <span className="stat-label">ваша роль</span>
                    </div>
                  </div>
                  <div className="group-actions">
                    <div className="invite-section">
                      <div className="invite-label">Код приглашения:</div>
                      <div className="invite-code-display">{group.inviteCode}</div>
                    </div>
                    <Button variant="primary" href={`/groups/${group._id}`}>
                      Открыть группу
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
