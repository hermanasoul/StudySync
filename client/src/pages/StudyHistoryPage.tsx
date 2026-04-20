// client\src\pages\StudyHistoryPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { studySessionsAPI, subjectsAPI } from '../services/api';
import './StudyHistoryPage.css';

interface Subject {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface StudySession {
  _id: string;
  name: string;
  description: string;
  host: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  subjectId: Subject;
  groupId?: {
    _id: string;
    name: string;
  };
  accessType: string;
  studyMode: string;
  status: string;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  userStats?: {
    timeSpent: number;
    cardsReviewed: number;
    correctAnswers: number;
    streak: number;
  };
}

const StudyHistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Фильтры
  const [subjectId, setSubjectId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await subjectsAPI.getAll();
      if (res.data.success) {
        setSubjects(res.data.subjects);
      }
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, limit: pagination.limit };
      if (subjectId) params.subjectId = subjectId;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await studySessionsAPI.getHistory(params);
      if (res.data.success) {
        setSessions(res.data.sessions);
        setPagination(prev => ({ ...prev, ...res.data.pagination }));
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, subjectId, fromDate, toDate]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSuccessRate = (session: StudySession) => {
    if (!session.userStats || session.userStats.cardsReviewed === 0) return '—';
    return Math.round((session.userStats.correctAnswers / session.userStats.cardsReviewed) * 100) + '%';
  };

  // Экспорт в CSV
  const exportToCSV = () => {
    if (sessions.length === 0) return;

    const headers = [
      'Название', 'Предмет', 'Группа', 'Дата', 'Режим',
      'Карточек изучено', 'Правильных', 'Успеваемость', 'Время (мин)'
    ];

    const rows = sessions.map(s => [
      s.name,
      s.subjectId.name,
      s.groupId?.name || '—',
      formatDate(s.createdAt),
      s.studyMode === 'collaborative' ? 'Совместный' : s.studyMode === 'individual' ? 'Индивидуальный' : 'Ведущий',
      s.userStats?.cardsReviewed || 0,
      s.userStats?.correctAnswers || 0,
      getSuccessRate(s),
      s.userStats ? Math.floor(s.userStats.timeSpent / 60) : 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `study_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSubjectId('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>История учебных сессий</h1>
        <button className="btn btn-outline" onClick={exportToCSV} disabled={sessions.length === 0}>
          📥 Экспорт CSV
        </button>
      </div>

      <div className="filters-panel">
        <div className="filter-group">
          <label>Предмет</label>
          <select value={subjectId} onChange={e => setSubjectId(e.target.value)}>
            <option value="">Все предметы</option>
            {subjects.map(subj => (
              <option key={subj._id} value={subj._id}>{subj.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>С даты</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>По дату</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <button className="btn btn-sm" onClick={clearFilters}>Сбросить фильтры</button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">Нет завершённых сессий</div>
      ) : (
        <>
          <table className="history-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Предмет</th>
                <th>Дата</th>
                <th>Режим</th>
                <th>Изучено</th>
                <th>Правильно</th>
                <th>Успеваемость</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session._id}>
                  <td>
                    <div className="session-name">
                      {session.name}
                      {session.groupId && <span className="group-tag">{session.groupId.name}</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: session.subjectId.color }}>
                      {session.subjectId.icon} {session.subjectId.name}
                    </span>
                  </td>
                  <td>{formatDate(session.createdAt)}</td>
                  <td>
                    {session.studyMode === 'collaborative' && '🤝 Совместный'}
                    {session.studyMode === 'individual' && '👤 Индивид.'}
                    {session.studyMode === 'host-controlled' && '🎮 Ведущий'}
                  </td>
                  <td>{session.userStats?.cardsReviewed || 0}</td>
                  <td>{session.userStats?.correctAnswers || 0}</td>
                  <td>{getSuccessRate(session)}</td>
                  <td>{session.userStats ? formatTime(session.userStats.timeSpent) : '0:00'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              ← Назад
            </button>
            <span>Страница {pagination.page} из {pagination.pages}</span>
            <button
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Вперёд →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StudyHistoryPage;