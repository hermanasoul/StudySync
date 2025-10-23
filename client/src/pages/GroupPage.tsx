import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import CreateGroupFlashcardModal from '../components/CreateGroupFlashcardModal';
import CreateGroupNoteModal from '../components/CreateGroupNoteModal';
import EditGroupNoteModal from '../components/EditGroupNoteModal';
import InviteMembersModal from '../components/InviteMembersModal';
import Button from '../components/Button';
import { groupsAPI } from '../services/api';
import './GroupPage.css';
import '../App.css';

interface Group {
  _id: string;
  name: string;
  description: string;
  subjectId: {
    _id: string;
    name: string;
    color?: string;
  } | null;
  createdBy: {
    _id: string;
    name: string;
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

interface Note {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: {
    _id: string;
    name: string;
  };
  groupId: string;
}

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
  groupId: string;
}

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'flashcards' | 'notes'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateFlashcardModal, setShowCreateFlashcardModal] = useState(false);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [members, setMembers] = useState<Group['members']>([]);

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getById(groupId!);
      if (response.data.success) {
        setGroup(response.data.group);
      } else {
        console.error('API error, using fallback');
        const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
        // Fixed: Removed email from userData to match type {_id, name}
        const userData = {
          _id: currentUser.id || '1',
          name: currentUser.name || 'Вы'
        };
        const demoMembers = [
          { user: { _id: '1', name: userData.name, email: 'user@example.com' }, role: 'owner' },  // email ok in members.user
          {
            user: { _id: '2', name: 'Иван Петров', email: 'ivan.petrov@example.com' },
            role: 'member'
          }
        ];
        setGroup({
          _id: groupId!,
          name: 'Демо группа',
          description: 'Описание демо группы для изучения биологии.',
          subjectId: { _id: '1', name: 'Биология', color: 'green' },
          createdBy: userData,  // now matches type
          members: demoMembers,
          isPublic: true,
          inviteCode: 'DEMO123'
        });
        setMembers(demoMembers);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      const currentUser = JSON.parse(localStorage.getItem('studysync_user') || '{}');
      setGroup({
        _id: groupId!,
        name: 'Демо группа',
        description: 'Описание демо группы для изучения биологии.',
        subjectId: { _id: '1', name: 'Биология', color: 'green' },
        createdBy: { _id: currentUser.id || '1', name: currentUser.name || 'Вы' },  // Fixed: no email in type
        members: [],
        isPublic: true,
        inviteCode: 'DEMO123'
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await groupsAPI.getMembers(groupId);
      if (response.data.success) {
        setMembers(response.data.members);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, [groupId]);

  const loadNotes = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await groupsAPI.getNotes(groupId);
      if (response.data.success) {
        setNotes(response.data.notes || []);
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  }, [groupId]);

  const loadFlashcards = useCallback(async () => {
    if (!groupId) return;
    try {
      const response = await groupsAPI.getFlashcards(groupId);
      if (response.data.success) {
        setFlashcards(response.data.flashcards || []);
      } else {
        setFlashcards([]);
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
      setFlashcards([]);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadNotes();
      loadMembers();
      loadFlashcards();
    }
  }, [groupId, loadGroup, loadMembers, loadNotes, loadFlashcards]);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: 'Владелец', color: '#ef4444' },
      admin: { label: 'Админ', color: '#f59e0b' },
      member: { label: 'Участник', color: '#3b82f6' }
    };
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    return (
      <span className="role-badge" style={{ backgroundColor: config.color }}>
        {config.label}
      </span>
    );
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    try {
      await groupsAPI.delete(group._id);
      alert('Группа удалена!');
      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Ошибка удаления группы');
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
        <div className="page-with-header">
          <div className="loading">Загрузка группы...</div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-page">
        <Header />
        <div className="page-with-header">
          <div className="error-page">
            <h2>Группа не найдена</h2>
            <p>Группа не существует или у вас нет доступа.</p>
            <Button variant="primary" href="/groups">Вернуться к группам</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group-page">
      <Header />
      <div className="page-with-header">
        <div className="group-container">
          <div className="breadcrumb">
            <Link to="/groups">Группы</Link> / <span>{group.name}</span>
          </div>
          <div className="group-header">
            <div className="group-title-section">
              <div className="group-info">
                <h1>{group.name}</h1>
                <div className="group-meta">
                  <span className={`subject-tag ${group.subjectId?.color || 'blue'}`}>
                    {group.subjectId?.name || 'Без предмета'}
                  </span>
                  {group.isPublic && <span className="public-badge">Публичная</span>}
                  <span className="member-count">{members.length} участников</span>
                </div>
              </div>
              <div className="group-actions-header">
                <div className="invite-section">
                  <div className="invite-label">Код приглашения:</div>
                  <div className="invite-code-display">{group.inviteCode}</div>
                </div>
                {isUserOwner() && (
                  <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    Удалить группу
                  </Button>
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
              <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                Обзор
              </button>
              <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
                Участники ({members.length})
              </button>
              <button className={`tab ${activeTab === 'flashcards' ? 'active' : ''}`} onClick={() => setActiveTab('flashcards')}>
                Карточки ({flashcards.length})
              </button>
              <button className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
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
                        <div className="stat-number">{flashcards.length}</div>
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
                      <Button variant="primary" onClick={() => setShowCreateFlashcardModal(true)}>
                        Создать карточку
                      </Button>
                      <Button variant="success" onClick={() => setShowInviteModal(true)}>
                        Пригласить участников
                      </Button>
                      <Button variant="outline" href={`/subjects/${group.subjectId?._id}/flashcards`}>
                        Изучать карточки
                      </Button>
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
                  <div className="flashcards-header">
                    <h3>Карточки группы ({flashcards.length})</h3>
                    <Button variant="primary" onClick={() => setShowCreateFlashcardModal(true)}>
                      + Создать карточку
                    </Button>
                  </div>
                  {flashcards.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📚</div>
                      <h4>Пока нет карточек</h4>
                      <p>Создайте первую карточку для совместного изучения</p>
                      <Button variant="primary" onClick={() => setShowCreateFlashcardModal(true)}>
                        Создать карточку
                      </Button>
                    </div>
                  ) : (
                    <div className="flashcards-list">
                      {flashcards.map((flashcard) => (
                        <div key={flashcard._id} className="flashcard-card">
                          <div className="flashcard-content">
                            <div className="flashcard-question">
                              <h4>{flashcard.question}</h4>
                              {flashcard.hint && (
                                <div className="flashcard-hint">💡 {flashcard.hint}</div>
                              )}
                            </div>
                            <div className="flashcard-answer">
                              <p>{flashcard.answer}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'notes' && (
                <div className="notes-tab">
                  <div className="notes-header">
                    <h3>Заметки группы ({notes.length})</h3>
                    <Button variant="primary" onClick={() => setShowCreateNoteModal(true)}>
                      + Создать заметку
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">📝</div>
                      <h4>Пока нет заметок</h4>
                      <p>Создайте первую заметку для совместной работы</p>
                      <Button variant="primary" onClick={() => setShowCreateNoteModal(true)}>
                        Создать заметку
                      </Button>
                    </div>
                  ) : (
                    <div className="notes-list">
                      {notes.map((note) => (
                        <div key={note._id} className="note-card">
                          <div className="note-header">
                            <div className="note-title">{note.title}</div>
                            <div className="note-actions">
                              <button className="edit-btn" onClick={() => handleEditNote(note)} title="Редактировать">
                                ✏️
                              </button>
                            </div>
                          </div>
                          <div className="note-meta">
                            <span className="note-author">Автор: {note.authorId.name}</span>
                            <span className="note-date">
                              {new Date(note.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <div className="note-content">{note.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Отмена</Button>
              <Button variant="danger" onClick={handleDeleteGroup}>Удалить группу</Button>
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
            subjectId={group.subjectId?._id || ''}
            onFlashcardCreated={() => {
              loadFlashcards();
              loadGroup();
            }}
          />
          <CreateGroupNoteModal
            isOpen={showCreateNoteModal}
            onClose={() => setShowCreateNoteModal(false)}
            groupId={group._id}
            onNoteCreated={loadNotes}
          />
          <EditGroupNoteModal
            isOpen={showEditNoteModal}
            onClose={() => {
              setShowEditNoteModal(false);
              setEditingNote(null);
            }}
            note={editingNote}
            groupId={group._id}
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
