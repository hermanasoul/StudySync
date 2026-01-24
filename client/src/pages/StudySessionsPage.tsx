// client/src/pages/StudySessionsPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studySessionsAPI, subjectsAPI, groupsAPI } from '../services/api';
import CreateStudySessionModal from '../components/CreateStudySessionModal';
import StudySessionCard from '../components/StudySessionCard';
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

const StudySessionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Фильтры
  const [filters, setFilters] = useState({
    accessType: 'all',
    subjectId: '',
    groupId: '',
    friendsOnly: false,
    showActiveOnly: true
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Загружаем предметы
      const subjectsResponse = await subjectsAPI.getAll();
      if (subjectsResponse.data.success) {
        setSubjects(subjectsResponse.data.subjects);
      }

      // Загружаем группы пользователя
      const groupsResponse = await groupsAPI.getMy();
      if (groupsResponse.data.success) {
        setGroups(groupsResponse.data.groups);
      }

      // Загружаем сессии
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
  };

  const handleCreateSession = () => {
    setShowCreateModal(true);
  };

  const handleSessionCreated = (newSession: StudySession) => {
    setSessions([newSession, ...sessions]);
    setShowCreateModal(false);
    
    // Переходим в созданную сессию
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

  const handleRefresh = () => {
    fetchData();
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getActiveSessionsCount = () => {
    return sessions.filter(s => s.status === 'active').length;
  };

  const getWaitingSessionsCount = () => {
    return sessions.filter(s => s.status === 'waiting').length;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Совместные учебные сессии</h1>
          <div className="page-subtitle">
            Изучайте материал вместе с друзьями и коллегами
          </div>
        </div>
        <div className="header-right">
          <button 
            className="btn btn-primary btn-lg"
            onClick={handleCreateSession}
          >
            <span className="btn-icon">+</span> Создать сессию
          </button>
          <button 
            className="btn btn-outline btn-lg"
            onClick={handleRefresh}
          >
            <span className="btn-icon">⟳</span> Обновить
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Всего сессий</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{getActiveSessionsCount()}</div>
          <div className="stat-label">Активных</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{getWaitingSessionsCount()}</div>
          <div className="stat-label">Ожидают начала</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {sessions.reduce((sum, session) => sum + session.participantCount, 0)}
          </div>
          <div className="stat-label">Участников онлайн</div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label className="filter-label">Тип доступа</label>
          <select 
            className="filter-select"
            value={filters.accessType}
            onChange={(e) => handleFilterChange('accessType', e.target.value)}
          >
            <option value="all">Все типы</option>
            <option value="public">Публичные</option>
            <option value="friends">С друзьями</option>
            <option value="private">Приватные</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Предмет</label>
          <select 
            className="filter-select"
            value={filters.subjectId}
            onChange={(e) => handleFilterChange('subjectId', e.target.value)}
          >
            <option value="">Все предметы</option>
            {subjects.map(subject => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Группа</label>
          <select 
            className="filter-select"
            value={filters.groupId}
            onChange={(e) => handleFilterChange('groupId', e.target.value)}
          >
            <option value="">Все группы</option>
            {groups.map(group => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-checkboxes">
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={filters.friendsOnly}
              onChange={(e) => handleFilterChange('friendsOnly', e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            Только с друзьями
          </label>
          
          <label className="checkbox-label">
            <input 
              type="checkbox"
              checked={filters.showActiveOnly}
              onChange={(e) => handleFilterChange('showActiveOnly', e.target.checked)}
            />
            <span className="checkbox-custom"></span>
            Только активные
          </label>
        </div>
      </div>

      <div className="content-section">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <div>Загрузка сессий...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>Нет доступных сессий</h3>
            <p>Создайте свою первую сессию или подождите, пока другие пользователи создадут новые</p>
            <button 
              className="btn btn-primary"
              onClick={handleCreateSession}
            >
              Создать сессию
            </button>
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