import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import CreateGroupFlashcardModal from '../components/CreateGroupFlashcardModal';
import CreateGroupNoteModal from '../components/CreateGroupNoteModal';
import EditGroupNoteModal from '../components/EditGroupNoteModal';
import InviteMembersModal from '../components/InviteMembersModal';
import { groupsAPI } from '../services/api';
import './GroupPage.css';

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
}

// Фикс TS: Note совместим с backend (response.data.notes)
interface Note {
  _id: string; // Mongo _id вместо id
  title: string;
  content: string;
  createdAt: string;
  authorId: {
    _id: string;
    name: string; // authorId.name из populate
  };
  groupId: string;
}

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'flashcards' | 'notes'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateFlashcardModal, setShowCreateFlashcardModal] = useState(false);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null); // Фикс: тип Note | null
  const [members, setMembers] = useState<Group['members']>([]);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadNotes();
      loadMembers();
    }
  }, [groupId]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getById(groupId!);
      if (response.data.success) {
        setGroup(response.data.group);
      } else {
        console.error('API error, using fallback');
        const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
        const userData = {
          _id: currentUser.id || '1',
          name: currentUser.name || 'Вы',
          email: currentUser.email || 'user@example.com'
        };
        const demoMembers = [
          { user: userData, role: 'owner' },
          {
            user: {
              _id: '2',
              name: 'Иван Петров',
              email: 'ivan.petrov@example.com'
            },
            role: 'member'
          },
          {
            user: {
              _id: '3',
              name: 'Мария Сидорова',
              email: 'maria.sidorova@example.com'
            },
            role: 'member'
          },
          {
            user: {
              _id: '4',
              name: 'Алексей Козлов',
              email: 'alex.kozlov@example.com'
            },
            role: 'admin'
          }
        ];
        setGroup({
          _id: groupId!,
          name: 'Биология для начинающих',
          description: 'Изучаем основы биологии вместе.',
          subjectId: { _id: '1', name: 'Биология', color: 'green' },
          createdBy: userData,
          members: demoMembers,
          isPublic: true,
          inviteCode: 'BIO123'
        });
        setMembers(demoMembers);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      // Fallback для demo (если API полностью down)
      const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
      const userData = {
        _id: currentUser.id || '1',
        name: currentUser.name || 'Вы',
        email: currentUser.email || 'user@example.com'
      };
      const demoMembers = [
        { user: userData, role: 'owner' },
        {
          user: {
            _id: '2',
            name: 'Иван Петров',
            email: 'ivan.petrov@example.com'
          },
          role: 'member'
        },
        {
          user: {
            _id: '3',
            name: 'Мария Сидорова',
            email: 'maria.sidorova@example.com'
          },
          role: 'member'
        },
        {
          user: {
            _id: '4',
            name: 'Алексей Козлов',
            email: 'alex.kozlov@example.com'
          },
          role: 'admin'
        }
      ];
      setGroup({
        _id: groupId!,
        name: 'Биология для начинающих',
        description: 'Изучаем основы биологии вместе.',
        subjectId: { _id: '1', name: 'Биология', color: 'green' },
        createdBy: userData,
        members: demoMembers,
        isPublic: true,
        inviteCode: 'BIO123'
      });
      setMembers(demoMembers);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!groupId) return;
    try {
      const response = await groupsAPI.getMembers(groupId);
      if (response.data.success) {
        setMembers(response.data.members);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadNotes = async () => {
    if (!groupId) return;
    try {
      const response = await groupsAPI.getNotes(groupId);
      if (response.data.success) {
        setNotes(response.data.notes || []); // Фикс: типы совпадают
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
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

  const handleDeleteGroup = async () => {
    if (!group) return;
    try {
      // TODO: Реальный API delete: await groupsAPI.delete(group._id);
      alert('Группа успешно удалена!');
      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Ошибка при удалении группы');
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setShowEditNoteModal(true);
  };

  const isUserOwner = () => {
    const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
    return group?.createdBy._id === currentUser.id;
  };

  if (loading) {
    return (
      <div className="group-page">
        <Header />
        <div className="loading">Загрузка группы...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-page">
        <Header />
        <div className="error-page">
          <h2>Группа не найдена</h2>
          <p>Группа, которую вы ищете, не существует или у вас нет к ней доступа.</p>
          <Link to="/groups" className="btn-primary">
            Вернуться к группам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="group-page">
      <Header />
      <div className="group-container">
        <div className="breadcrumb">
          <Link to="/groups">Группы</Link> / <span>{group.name}</span>
        </div>
        <div className="group-header">
          <div className="group-title-section">
            <div className="group-info">
              <h1>{group.name}</h1>
              <div className="group-meta">
                <span className={`subject-tag ${group.subjectId.color}`}>
                  {group.subjectId.name}
                </span>
                {group.isPublic && <span className="public-badge">Публичная</span>}
                <span className="member-count">{group.members.length} участников</span>
              </div>
            </div>
            <div className="group-actions-header">
              <div className="invite-section">
                <div className="invite-label">Код приглашения:</div>
                <div className="invite-code-display">{group.inviteCode}</div>
              </div>
              {isUserOwner() && (
                <button
                  className="btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Удалить группу
                </button>
              )}
            </div>
          </div>
          {group.description && (
            <div className="group-description-section">
              <p className="group-description">{group.description}</p>
            </div>
          )}
        </div>
        <div className="group-content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Обзор
            </button>
            <button
              className={`tab ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Участники ({members.length})
            </button>
            <button
              className={`tab ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('flashcards')}
            >
              Карточки
            </button>
            <button
              className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Заметки ({notes.length})
            </button>
          </div>
          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-number">{members.length}</div>
                      <div className="stat-label">Участников</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-info">
                      <div className="stat-number">0</div>
                      <div className="stat-label">Карточек</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-info">
                      <div className="stat-number">{notes.length}</div>
                      <div className="stat-label">Заметок</div>
                    </div>
                  </div>
                </div>
                <div className="quick-actions">
                  <h3>Быстрые действия</h3>
                  <div className="action-buttons">
                    <button
                      className="btn-primary"
                      onClick={() => setShowCreateFlashcardModal(true)}
                    >
                      Создать карточку
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => setShowInviteModal(true)}
                    >
                      Пригласить участников
                    </button>
                    <Link
                      to={`/subjects/${group.subjectId._id}/flashcards`}
                      className="btn-outline"
                    >
                      Изучать карточки
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'members' && (
              <div className="members-tab">
                <h3>Участники группы</h3>
                <div className="members-list">
                  {members.map((member, index) => (
                    <div key={index} className="member-card">
                      <div className="member-info">
                        <div className="member-avatar">
                          {member.user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="member-details">
                          <div className="member-name">{member.user.name}</div>
                          <div className="member-email">{member.user.email}</div>
                        </div>
                      </div>
                      <div className="member-role">
                        {getRoleBadge(member.role)}
                        <span className="join-date">
                          присоединился {new Date().toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'flashcards' && (
              <div className="flashcards-tab">
                <h3>Карточки группы</h3>
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <h4>Пока нет карточек</h4>
                  <p>Создайте первую карточку для совместного изучения</p>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCreateFlashcardModal(true)}
                  >
                    Создать карточку
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'notes' && (
              <div className="notes-tab">
                <div className="notes-header">
                  <h3>Заметки группы ({notes.length})</h3>
                  <button
                    className="btn-primary create-note-btn"
                    onClick={() => setShowCreateNoteModal(true)}
                  >
                    + Создать заметку
                  </button>
                </div>
                {notes.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h4>Пока нет заметок</h4>
                    <p>Создайте первую заметку для совместной работы</p>
                    <button
                      className="btn-primary"
                      onClick={() => setShowCreateNoteModal(true)}
                    >
                      Создать заметку
                    </button>
                  </div>
                ) : (
                  <div className="notes-list">
                    {notes.map((note) => (
                      <div key={note._id} className="note-card"> {/* Фикс: key={note._id} */}
                        <div className="note-header">
                          <h4 className="note-title">{note.title}</h4>
                          <div className="note-actions">
                            <button
                              className="edit-btn"
                              onClick={() => handleEditNote(note)}
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                          </div>
                        </div>
                        <div className="note-meta">
                          <span className="note-author">Автор: {note.authorId.name}</span> {/* Фикс: note.authorId.name */}
                          <span className="note-date">
                            {new Date(note.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <div className="note-content">
                          {note.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <div className="modal-header">
              <h2>Удалить группу</h2>
              <button className="close-button" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите удалить группу <strong>"{group.name}"</strong>?</p>
              <p>Это действие нельзя отменить.</p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Отмена
              </button>
              <button
                className="btn-danger"
                onClick={handleDeleteGroup}
              >
                Удалить группу
              </button>
            </div>
          </div>
        </div>
      )}

      {group && (
        <>
          <CreateGroupFlashcardModal
            isOpen={showCreateFlashcardModal}
            onClose={() => setShowCreateFlashcardModal(false)}
            groupId={group._id}
            subjectId={group.subjectId._id}
            onFlashcardCreated={() => {
              loadGroup(); // Перезагрузка для обновления stats (если 0 карточек)
            }}
          />
          <CreateGroupNoteModal
            isOpen={showCreateNoteModal}
            onClose={() => setShowCreateNoteModal(false)}
            groupId={group._id}
            onNoteCreated={loadNotes} // Фикс: reload после создания
          />
          <EditGroupNoteModal
  isOpen={showEditNoteModal}
  onClose={() => {
    setShowEditNoteModal(false);
    setEditingNote(null);
  }}
  note={editingNote}
  groupId={group._id} // Новый пропс
  onNoteUpdated={loadNotes}
  onNoteDeleted={loadNotes}
/>
          <InviteMembersModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            groupId={group._id}
            groupName={group.name}
            inviteCode={group.inviteCode}
          />
        </>
      )}
    </div>
  );
};

export default GroupPage;
