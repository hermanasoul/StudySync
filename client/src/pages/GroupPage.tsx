import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import CreateGroupFlashcardModal from '../components/CreateGroupFlashcardModal';
import CreateGroupNoteModal from '../components/CreateGroupNoteModal';
import EditGroupNoteModal from '../components/EditGroupNoteModal';
import EditFlashcardModal from '../components/EditFlashcardModal';
import InviteMembersModal from '../components/InviteMembersModal';
import ConfirmModal from '../components/ConfirmModal';
import StudyCompleteModal from '../components/StudyCompleteModal';
import Button from '../components/Button';
import { groupsAPI, notesAPI, flashcardsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './GroupPage.css';
import '../App.css';

interface Group {
  _id: string;
  name: string;
  description: string;
  subjectId: { id?: string; _id?: string; name: string; color?: string } | null;
  createdBy: { _id: string; name: string };
  members: Array<{ user: { _id: string; name: string; email: string }; role: string }>;
  isPublic: boolean;
  inviteCode: string;
}

interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  authorId: { _id: string; name: string };
  groupId: string;
}

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
  groupId?: string;
}

// ===== Компонент для отдельной карточки =====
interface FlashcardItemProps {
  flashcard: Flashcard;
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (id: string) => void;
}

const GroupFlashcardItem: React.FC<FlashcardItemProps> = ({ flashcard, onEdit, onDelete }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flashcard-card">
      <div className="flashcard-content">
        <div className="flashcard-question">
          <h4>{flashcard.question}</h4>
          {flashcard.hint && <div className="flashcard-hint">💡 {flashcard.hint}</div>}
        </div>
        {showAnswer && (
          <div className="flashcard-answer">
            <p>{flashcard.answer}</p>
          </div>
        )}
        <button
          className="btn btn-primary toggle-answer-btn"  // <-- изменено с btn-outline на btn-primary
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
        </button>
      </div>
      <div className="flashcard-actions">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => onEdit(flashcard)}
        >
          Редактировать
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => onDelete(flashcard._id)}
        >
          Удалить
        </button>
      </div>
    </div>
  );
};

// ===== Основной компонент страницы =====
const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'flashcards' | 'notes'>('overview');
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showCreateFlashcardModal, setShowCreateFlashcardModal] = useState(false);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [showEditFlashcardModal, setShowEditFlashcardModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [members, setMembers] = useState<Group['members']>([]);
  const [showDeleteFlashcardConfirm, setShowDeleteFlashcardConfirm] = useState(false);
  const [deletingFlashcardId, setDeletingFlashcardId] = useState<string | null>(null);
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // ===== Режим изучения карточек =====
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswerInStudy, setShowAnswerInStudy] = useState(false);
  const [studiedCards, setStudiedCards] = useState<string[]>([]);
  const [showStudyComplete, setShowStudyComplete] = useState(false);

  const isValidGroupId = !!groupId && groupId !== 'undefined';

  const loadAllData = useCallback(async () => {
    if (!isValidGroupId) return;
    try {
      setLoading(true);
      const groupRes = await groupsAPI.getById(groupId!);
      if (groupRes.data.success) {
        const g = groupRes.data.group;
        const normalizedGroup: Group = {
          _id: g._id || g.id,
          name: g.name,
          description: g.description,
          subjectId: g.subjectId ? {
            id: g.subjectId.id || g.subjectId._id,
            _id: g.subjectId._id || g.subjectId.id,
            name: g.subjectId.name,
            color: g.subjectId.color
          } : null,
          createdBy: g.createdBy,
          members: g.members || [],
          isPublic: g.isPublic,
          inviteCode: g.inviteCode
        };
        setGroup(normalizedGroup);
        setMembers(normalizedGroup.members);

        const [notesRes, flashcardsRes] = await Promise.all([
          groupsAPI.getNotes(g._id || g.id),
          groupsAPI.getFlashcards(g._id || g.id)
        ]);

        if (notesRes.data.success) {
          setNotes((notesRes.data.notes || []).map((n: any) => ({
            ...n,
            _id: n._id || n.id,
            tags: n.tags || [],
            updatedAt: n.updatedAt || n.createdAt,
            authorId: n.authorId ? { ...n.authorId, _id: n.authorId._id || n.authorId.id } : n.authorId
          })));
        }
        if (flashcardsRes.data.success) {
          setFlashcards((flashcardsRes.data.flashcards || []).map((f: any) => ({
            ...f,
            _id: f._id || f.id,
          })));
        }
      }
    } catch (error) {
      console.error(error);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [isValidGroupId, groupId]);

  useEffect(() => {
    if (isValidGroupId) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [isValidGroupId, loadAllData]);

  useEffect(() => {
    if (!group?._id) return;

    const handleNewFlashcard = (data: any) => {
      if (data.groupId === group._id) loadAllData();
    };
    const handleNewNote = (data: any) => {
      if (data.groupId === group._id) loadAllData();
    };
    const handleMemberJoined = (data: any) => {
      if (data.groupId === group._id) loadAllData();
    };

    webSocketService.joinGroup(group._id);
    webSocketService.on('new-flashcard', handleNewFlashcard);
    webSocketService.on('new-note', handleNewNote);
    webSocketService.on('member-joined', handleMemberJoined);

    return () => {
      webSocketService.leaveGroup(group._id);
      webSocketService.off('new-flashcard', handleNewFlashcard);
      webSocketService.off('new-note', handleNewNote);
      webSocketService.off('member-joined', handleMemberJoined);
    };
  }, [group?._id, loadAllData]);

  // Сброс режима изучения при смене вкладки
  useEffect(() => {
    if (activeTab !== 'flashcards') {
      setStudyMode(false);
    }
  }, [activeTab]);

  const getRoleBadge = (role: string) => {
    const cfg = { owner: { label: 'Владелец', color: '#ef4444' }, admin: { label: 'Админ', color: '#f59e0b' }, member: { label: 'Участник', color: '#3b82f6' } };
    const c = cfg[role as keyof typeof cfg] || cfg.member;
    return <span className="role-badge" style={{ backgroundColor: c.color }}>{c.label}</span>;
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    try { await groupsAPI.delete(group._id); alert('Группа удалена!'); navigate('/groups'); }
    catch (error) { alert('Ошибка удаления группы'); }
  };

  const isUserOwner = () => {
    const u = JSON.parse(localStorage.getItem('studysync_user') || '{}');
    return group?.createdBy._id === u.id;
  };

  // ===== Обработчики =====
  const handleNoteCreated = (newNoteData?: any) => {
    if (newNoteData?._id) {
      setNotes(prev => [{
        _id: newNoteData._id,
        title: newNoteData.title || '',
        content: newNoteData.content || '',
        tags: newNoteData.tags || [],
        createdAt: newNoteData.createdAt || new Date().toISOString(),
        updatedAt: newNoteData.updatedAt || new Date().toISOString(),
        authorId: newNoteData.authorId || { _id: '', name: 'Вы' },
        groupId: group?._id || ''
      }, ...prev]);
    } else {
      loadAllData();
    }
  };

  const handleFlashcardCreated = (newCardData?: any) => {
    if (newCardData?._id) {
      setFlashcards(prev => [{
        _id: newCardData._id,
        question: newCardData.question || '',
        answer: newCardData.answer || '',
        hint: newCardData.hint,
        subjectId: newCardData.subjectId || '',
        groupId: group?._id || ''
      }, ...prev]);
    } else {
      loadAllData();
    }
  };

  const handleFlashcardUpdated = (updatedCard?: Flashcard) => {
    if (updatedCard) {
      setFlashcards(prev => prev.map(f => f._id === updatedCard._id ? updatedCard : f));
    } else {
      loadAllData();
    }
  };

  const handleFlashcardDeleted = () => {
    loadAllData();
  };

  const handleNoteUpdated = (updatedNote?: Note) => {
    if (updatedNote) {
      setNotes(prev => prev.map(n => n._id === updatedNote._id ? updatedNote : n));
    } else {
      loadAllData();
    }
  };

  const handleNoteDeleted = () => {
    loadAllData();
  };

  const handleDeleteFlashcard = async () => {
    if (!deletingFlashcardId) return;
    try {
      await groupsAPI.deleteFlashcard(group!._id, deletingFlashcardId);
      setFlashcards(prev => prev.filter(f => f._id !== deletingFlashcardId));
      setShowDeleteFlashcardConfirm(false);
      setDeletingFlashcardId(null);
    } catch (err) {
      console.error('Delete flashcard error:', err);
      alert('Ошибка удаления карточки');
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNoteId) return;
    try {
      await notesAPI.delete(deletingNoteId);
      setNotes(prev => prev.filter(n => n._id !== deletingNoteId));
      setShowDeleteNoteConfirm(false);
      setDeletingNoteId(null);
    } catch (err) {
      console.error('Delete note error:', err);
      alert('Ошибка удаления заметки');
    }
  };

  // ===== Режим изучения =====
  const startStudy = () => {
    if (flashcards.length === 0) return;
    setStudyMode(true);
    setCurrentCardIndex(0);
    setShowAnswerInStudy(false);
    setStudiedCards([]);
    setShowStudyComplete(false);
  };

  const exitStudy = () => {
    setStudyMode(false);
    setShowStudyComplete(false);
  };

  const handleKnow = async () => {
    const card = flashcards[currentCardIndex];
    try {
      await flashcardsAPI.markAsKnown(card._id);
      if (!studiedCards.includes(card._id)) {
        setStudiedCards(prev => [...prev, card._id]);
      }
      nextCard();
    } catch (e) {
      console.error('Error marking as known:', e);
      nextCard();
    }
  };

  const handleDontKnow = async () => {
    const card = flashcards[currentCardIndex];
    try {
      await flashcardsAPI.markAsUnknown(card._id);
      if (!studiedCards.includes(card._id)) {
        setStudiedCards(prev => [...prev, card._id]);
      }
      nextCard();
    } catch (e) {
      console.error('Error marking as unknown:', e);
      nextCard();
    }
  };

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswerInStudy(false);
    } else {
      setShowStudyComplete(true);
    }
  };

  const restartStudy = () => {
    setCurrentCardIndex(0);
    setShowAnswerInStudy(false);
    setStudiedCards([]);
    setShowStudyComplete(false);
  };

  if (loading) return <div className="group-page"><Header /><div className="page-with-header"><div className="loading">Загрузка группы...</div></div></div>;
  if (!group) return <div className="group-page"><Header /><div className="page-with-header"><div className="error-page"><h2>Группа не найдена</h2><p>Группа не существует или у вас нет доступа.</p><Button variant="primary" href="/groups">Вернуться к группам</Button></div></div></div>;

  const subjectIdUnified = group.subjectId?.id || group.subjectId?._id;

  return (
    <div className="group-page">
      <Header />
      <div className="page-with-header">
        <div className="group-container">
          <div className="breadcrumb"><Link to="/groups">Группы</Link> / <span>{group.name}</span></div>
          <div className="group-header">
            <div className="group-title-section">
              <div className="group-info">
                <h1>{group.name}</h1>
                <div className="group-meta">
                  <span className={`subject-tag ${group.subjectId?.color || 'blue'}`}>{group.subjectId?.name || 'Без предмета'}</span>
                  {group.isPublic && <span className="public-badge">Публичная</span>}
                  <span className="member-count">{members.length} участников</span>
                </div>
                <div className="invite-section">
                  <div className="invite-label">Код приглашения:</div>
                  <div className="invite-code-display">{group.inviteCode}</div>
                </div>
              </div>
              <div className="group-actions-header">
                {isUserOwner() && <Button variant="danger" onClick={() => setShowDeleteGroupConfirm(true)}>Удалить группу</Button>}
              </div>
            </div>
            {group.description && <div className="group-description-section"><p className="group-description">{group.description}</p></div>}
          </div>
          <div className="group-content">
            <div className="tabs">
              <button className={`tab ${activeTab==='overview'?'active':''}`} onClick={()=>setActiveTab('overview')}>Обзор</button>
              <button className={`tab ${activeTab==='members'?'active':''}`} onClick={()=>setActiveTab('members')}>Участники ({members.length})</button>
              <button className={`tab ${activeTab==='flashcards'?'active':''}`} onClick={()=>setActiveTab('flashcards')}>Карточки ({flashcards.length})</button>
              <button className={`tab ${activeTab==='notes'?'active':''}`} onClick={()=>setActiveTab('notes')}>Заметки ({notes.length})</button>
            </div>
            <div className="tab-content">
              {activeTab==='overview' && (
                <div className="overview-tab">
                  <div className="stats-grid">
                    <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-info"><div className="stat-number">{members.length}</div><div className="stat-label">Участников</div></div></div>
                    <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-info"><div className="stat-number">{flashcards.length}</div><div className="stat-label">Карточек</div></div></div>
                    <div className="stat-card"><div className="stat-icon">📝</div><div className="stat-info"><div className="stat-number">{notes.length}</div><div className="stat-label">Заметок</div></div></div>
                  </div>
                  <div className="quick-actions">
                    <h3>Быстрые действия</h3>
                    <div className="action-buttons">
                      <Button variant="primary" onClick={()=>setShowCreateFlashcardModal(true)}>Создать карточку</Button>
                      <Button variant="success" onClick={()=>setShowInviteModal(true)}>Пригласить участников</Button>
                      {subjectIdUnified && (
                        <Button variant="outline" onClick={startStudy}>
                          Изучать все карточки
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab==='members' && (
                <div className="members-tab">
                  <h3>Участники группы</h3>
                  <div className="members-list">
                    {members.map((m,i)=><div key={i} className="member-card"><div className="member-info"><div className="member-avatar">{m.user.name?.charAt(0)?.toUpperCase()||'U'}</div><div className="member-details"><div className="member-name">{m.user.name}</div><div className="member-email">{m.user.email}</div></div></div><div className="member-role">{getRoleBadge(m.role)}<span className="join-date">присоединился {new Date().toLocaleDateString('ru-RU')}</span></div></div>)}
                  </div>
                </div>
              )}
              {activeTab==='flashcards' && (
                <div className="flashcards-tab">
                  <div className="flashcards-header">
                    <h3>Карточки группы ({flashcards.length})</h3>
                    <div className="flashcards-header-actions">
                      {subjectIdUnified && (
                        <Button variant="outline" onClick={startStudy}>
                          Изучать все карточки
                        </Button>
                      )}
                      <Button variant="primary" onClick={()=>setShowCreateFlashcardModal(true)}>+ Создать карточку</Button>
                    </div>
                  </div>
                  {flashcards.length===0 ? (
                    <div className="empty-state"><div className="empty-icon">📚</div><h4>Пока нет карточек</h4><p>Создайте первую карточку для совместного изучения</p><Button variant="primary" onClick={()=>setShowCreateFlashcardModal(true)}>Создать карточку</Button></div>
                  ) : studyMode ? (
                    <div className="study-mode">
                      <div className="study-progress">Прогресс: {currentCardIndex + 1} / {flashcards.length}</div>
                      <div className="flashcard-study">
                        <div className="study-card">
                          <div className="card-question">
                            <h2>{flashcards[currentCardIndex].question}</h2>
                            {flashcards[currentCardIndex].hint && <div className="card-hint">💡 {flashcards[currentCardIndex].hint}</div>}
                          </div>
                          {showAnswerInStudy && (
                            <div className="card-answer"><h3>Ответ:</h3><p>{flashcards[currentCardIndex].answer}</p></div>
                          )}
                          <div className="study-actions">
                            {!showAnswerInStudy ? (
                              <button className="btn btn-primary" onClick={() => setShowAnswerInStudy(true)}>Показать ответ</button>
                            ) : (
                              <div className="knowledge-actions">
                                <button className="btn btn-success" onClick={handleKnow}>Знаю ✅</button>
                                <button className="btn btn-danger" onClick={handleDontKnow}>Не знаю ❌</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="study-exit">
                        <button className="btn btn-outline" onClick={exitStudy}>Выйти из изучения</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flashcards-list">
                      {flashcards.map(f => (
                        <GroupFlashcardItem
                          key={f._id}
                          flashcard={f}
                          onEdit={(card) => {
                            setEditingFlashcard(card);
                            setShowEditFlashcardModal(true);
                          }}
                          onDelete={(id) => {
                            setDeletingFlashcardId(id);
                            setShowDeleteFlashcardConfirm(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab==='notes' && (
                <div className="notes-tab">
                  <div className="notes-header">
                    <h3>Заметки группы ({notes.length})</h3>
                    <button
                      className="btn btn-sm btn-primary create-note-btn"
                      onClick={()=>setShowCreateNoteModal(true)}
                    >
                      + Создать заметку
                    </button>
                  </div>
                  {notes.length===0 ? (
                    <div className="empty-state"><div className="empty-icon">📝</div><h4>Пока нет заметок</h4><p>Создайте первую заметку для совместной работы</p><button className="btn btn-sm btn-primary" onClick={()=>setShowCreateNoteModal(true)}>Создать заметку</button></div>
                  ) : (
                    <div className="notes-list">
                      {notes.map(n=>(
                        <div key={n._id} className="note-card">
                          <div className="note-header">
                            <div className="note-title">{n.title}</div>
                            <div className="note-actions">
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={()=>{ setEditingNote(n); setShowEditNoteModal(true); }}
                              >
                                Редактировать
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  setDeletingNoteId(n._id);
                                  setShowDeleteNoteConfirm(true);
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                          <div className="note-meta">
                            <span className="note-author">Автор: {n.authorId.name}</span>
                            <span className="note-date">{new Date(n.createdAt).toLocaleDateString('ru-RU')}</span>
                          </div>
                          <div className="note-content">{n.content}</div>
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

      {/* Модалки */}
      {showDeleteGroupConfirm && (
        <div className="modal-overlay"><div className="modal-content delete-modal"><div className="modal-header"><h2>Удалить группу</h2><button className="close-button" onClick={()=>setShowDeleteGroupConfirm(false)}>×</button></div><div className="modal-body"><p>Вы уверены, что хотите удалить группу <strong>"{group.name}"</strong>?</p><p>Это действие нельзя отменить.</p></div><div className="modal-actions"><Button variant="outline" onClick={()=>setShowDeleteGroupConfirm(false)}>Отмена</Button><Button variant="danger" onClick={handleDeleteGroup}>Удалить группу</Button></div></div></div>
      )}

      <ConfirmModal
        isOpen={showDeleteFlashcardConfirm}
        onClose={() => { setShowDeleteFlashcardConfirm(false); setDeletingFlashcardId(null); }}
        onConfirm={handleDeleteFlashcard}
        title="Удаление карточки"
        message="Вы уверены, что хотите удалить эту карточку? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
      />

      <ConfirmModal
        isOpen={showDeleteNoteConfirm}
        onClose={() => { setShowDeleteNoteConfirm(false); setDeletingNoteId(null); }}
        onConfirm={handleDeleteNote}
        title="Удаление заметки"
        message="Вы уверены, что хотите удалить эту заметку? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
      />

      <StudyCompleteModal
        isOpen={showStudyComplete}
        onClose={exitStudy}
        studiedCount={studiedCards.length}
        totalCount={flashcards.length}
        onRestart={restartStudy}
        mode="flashcards"
      />

      {group && (
        <>
          <CreateGroupFlashcardModal
            isOpen={showCreateFlashcardModal}
            onClose={() => setShowCreateFlashcardModal(false)}
            groupId={group._id}
            subjectId={subjectIdUnified || ''}
            onFlashcardCreated={handleFlashcardCreated}
          />
          <CreateGroupNoteModal
            isOpen={showCreateNoteModal}
            onClose={() => setShowCreateNoteModal(false)}
            groupId={group._id}
            onNoteCreated={handleNoteCreated}
          />
          <EditGroupNoteModal
            isOpen={showEditNoteModal}
            onClose={() => { setShowEditNoteModal(false); setEditingNote(null); }}
            note={editingNote}
            groupId={group._id}
            onNoteUpdated={handleNoteUpdated}
            onNoteDeleted={handleNoteDeleted}
          />
          <EditFlashcardModal
            isOpen={showEditFlashcardModal}
            onClose={() => { setShowEditFlashcardModal(false); setEditingFlashcard(null); }}
            flashcard={editingFlashcard}
            onFlashcardUpdated={handleFlashcardUpdated}
            onFlashcardDeleted={handleFlashcardDeleted}
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