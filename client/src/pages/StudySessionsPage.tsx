import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studySessionsAPI, subjectsAPI, groupsAPI } from '../services/api';
import CreateStudySessionModal from '../components/CreateStudySessionModal';
import StudySessionCard from '../components/StudySessionCard';
import Header from '../components/Header';
import './StudySessionsPage.css';

interface Subject {
  _id: string;
  name: string;
  color: string;
  icon: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
}

interface StudySession {
  _id: string;
  name: string;
  description: string;
  host: {
    _id: string;
    name: string;
    avatarUrl: string;
    level: number;
  };
  participants: Array<{
    user: {
      _id: string;
      name: string;
      avatarUrl: string;
      level: number;
    };
    role: string;
    status: string;
  }>;
  subjectId: Subject;
  groupId?: Group;
  accessType: 'public' | 'friends' | 'private';
  studyMode: string;
  status: string;
  participantCount: number;
  createdAt: string;
}

const initialFilters = {
  accessType: 'all',
  subjectId: '',
  groupId: '',
  friendsOnly: false,
  showActiveOnly: true
};

const StudySessionsPage: React.FC = () => {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [filters, setFilters] = useState(initialFilters);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const subjectsResponse = await subjectsAPI.getAll();
      if (subjectsResponse.data.success) {
        setSubjects(subjectsResponse.data.subjects);
      }
      const groupsResponse = await groupsAPI.getMy();
      if (groupsResponse.data.success) {
        setGroups(groupsResponse.data.groups);
      }
      const params: any = {};
      if (filters.accessType !== 'all') params.accessType = filters.accessType;
      if (filters.subjectId) params.subjectId = filters.subjectId;
      if (filters.groupId) params.groupId = filters.groupId;
      if (filters.friendsOnly) params.friendsOnly = true;

      const sessionsResponse = await studySessionsAPI.getActive(params);
      if (sessionsResponse.data.success) {
        let filteredSessions = sessionsResponse.data.sessions;
        if (filters.showActiveOnly) {
          filteredSessions = filteredSessions.filter(
            (session: StudySession) => session.status === 'waiting' || session.status === 'active'
          );
        }
        setSessions(filteredSessions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSession = () => setShowCreateModal(true);

  const handleSessionCreated = (newSession: StudySession) => {
    setSessions([newSession, ...sessions]);
    setShowCreateModal(false);
    navigate(`/study-session/${newSession._id}`);
  };

  const handleJoinSession = async (sessionId: string) => {
    try {
      await studySessionsAPI.join(sessionId);
      navigate(`/study-session/${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
    }
  };

  const handleRefresh = () => fetchData();

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const toggleFriendsOnly = () => {
    setFilters(prev => ({ ...prev, friendsOnly: !prev.friendsOnly }));
  };

  const toggleShowActiveOnly = () => {
    setFilters(prev => ({ ...prev, showActiveOnly: !prev.showActiveOnly }));
  };

  const getActiveSessionsCount = () => sessions.filter(s => s.status === 'active').length;
  const getWaitingSessionsCount = () => sessions.filter(s => s.status === 'waiting').length;

  return (
    <div className="study-sessions-page">
      <Header />
      <div className="page-content">
        {/* Верхняя строка: заголовок + кнопки */}
        <div className="page-top-row">
          <div className="page-heading">
            <h1 className="page-title">Совместные учебные сессии</h1>
            <p className="page-subtitle">Изучайте материал вместе с друзьями и коллегами</p>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary create-btn" onClick={handleCreateSession}>
              + Создать сессию
            </button>
            <button className="btn btn-outline refresh-btn" onClick={handleRefresh} title="Обновить">
              ⟳
            </button>
          </div>
        </div>

        {/* Статистика горизонтально */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{sessions.length}</span>
            <span className="stat-label">Всего сессий</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{getActiveSessionsCount()}</span>
            <span className="stat-label">Активных</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{getWaitingSessionsCount()}</span>
            <span className="stat-label">Ожидают начала</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {sessions.reduce((sum, s) => sum + s.participantCount, 0)}
            </span>
            <span className="stat-label">Участников онлайн</span>
          </div>
        </div>

        {/* Фильтры */}
        <div className="filters-row">
          <div className="filter-group">
            <label>Тип доступа</label>
            <select value={filters.accessType} onChange={e => handleFilterChange('accessType', e.target.value)}>
              <option value="all">Все типы</option>
              <option value="public">Публичные</option>
              <option value="friends">С друзьями</option>
              <option value="private">Приватные</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Предмет</label>
            <select value={filters.subjectId} onChange={e => handleFilterChange('subjectId', e.target.value)}>
              <option value="">Все предметы</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Группа</label>
            <select value={filters.groupId} onChange={e => handleFilterChange('groupId', e.target.value)}>
              <option value="">Все группы</option>
              {groups.map(g => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-checkboxes">
            {/* Кнопка-переключатель "Только с друзьями" */}
            <button
              className={`filter-toggle-btn ${filters.friendsOnly ? 'active' : ''}`}
              onClick={toggleFriendsOnly}
              type="button"
            >
              Только с друзьями
            </button>

            {/* Кнопка-переключатель "Только активные" */}
            <button
              className={`filter-toggle-btn ${filters.showActiveOnly ? 'active' : ''}`}
              onClick={toggleShowActiveOnly}
              type="button"
            >
              Только активные
            </button>

            {/* Кнопка сброса */}
            <button
              onClick={resetFilters}
              className="reset-btn"
            >
              Сбросить
            </button>
          </div>
        </div>

        {/* Контент: загрузка или список сессий */}
        <div className="sessions-content">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Загрузка сессий...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>Нет доступных сессий</h3>
              <p>Создайте свою первую сессию или подождите, пока другие пользователи создадут новые</p>
              <button className="btn btn-primary" onClick={handleCreateSession}>Создать сессию</button>
            </div>
          ) : (
            <div className="sessions-grid">
              {sessions.map(session => (
                <StudySessionCard
                  key={session._id}
                  session={session}
                  onJoin={() => handleJoinSession(session._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateStudySessionModal
          onClose={() => setShowCreateModal(false)}
          onSessionCreated={handleSessionCreated}
          subjects={subjects}
          groups={groups}
        />
      )}
    </div>
  );
};

export default StudySessionsPage;