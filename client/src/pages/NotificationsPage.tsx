// client/src/pages/NotificationsPage.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Button from '../components/Button';
import { notificationsAPI, studySessionsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './NotificationsPage.css';
import '../App.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
  formattedDate: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Array<{
    type: string;
    total: number;
    unread: number;
  }>;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all',
    read: 'all',
    search: ''
  });
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'read' | 'unread' | 'archive' | 'delete'>('read');

  useEffect(() => {
    loadNotifications();
    loadStats();
    
    const handleNewNotification = (notification: Notification) => {
      console.log('New notification received on page:', notification);
      setNotifications(prev => [notification, ...prev]);
    };
    
    webSocketService.on('notification', handleNewNotification);
    
    return () => {
      webSocketService.off('notification', handleNewNotification);
    };
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter]);

  const loadNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll({
        page: pageNum,
        limit: 20,
        type: filter.type !== 'all' ? filter.type : undefined,
        read: filter.read !== 'all' ? filter.read : undefined
      });
      
      if (response.data.success) {
        if (pageNum === 1) {
          setNotifications(response.data.notifications);
        } else {
          setNotifications(prev => [...prev, ...response.data.notifications]);
        }
        setHasMore(pageNum < response.data.pagination.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await notificationsAPI.getStats();
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(notif =>
        notif.title.toLowerCase().includes(searchLower) ||
        notif.message.toLowerCase().includes(searchLower)
      );
    }
    setFilteredNotifications(filtered);
  };

  const handleFilterChange = (newFilter: Partial<typeof filter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
    setPage(1);
    loadNotifications(1);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      loadStats();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: false } : notif
        )
      );
      loadStats();
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await notificationsAPI.archive(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      loadStats();
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить это уведомление?')) {
      try {
        await notificationsAPI.delete(id);
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        loadStats();
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      loadStats();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleBulkAction = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      if (bulkAction === 'read') {
        for (const id of selectedNotifications) {
          await notificationsAPI.markAsRead(id);
        }
      } else if (bulkAction === 'archive') {
        for (const id of selectedNotifications) {
          await notificationsAPI.archive(id);
        }
      } else if (bulkAction === 'delete') {
        if (window.confirm(`Вы уверены, что хотите удалить ${selectedNotifications.length} уведомлений?`)) {
          for (const id of selectedNotifications) {
            await notificationsAPI.delete(id);
          }
        }
      }
      
      loadNotifications(1);
      setSelectedNotifications([]);
      loadStats();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const handleLoadMore = () => {
    loadNotifications(page + 1);
  };

  const toggleSelectNotification = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id)
        ? prev.filter(notifId => notifId !== id)
        : [...prev, id]
    );
  };

  const handleJoinStudySession = async (sessionId: string, notificationId: string) => {
    try {
      await studySessionsAPI.join(sessionId);
      navigate(`/study-sessions/${sessionId}`);
      // Пометим уведомление как прочитанное
      await handleMarkAsRead(notificationId);
    } catch (error) {
      console.error('Error joining study session:', error);
      alert('Не удалось присоединиться к сессии');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'group_invitation': 'Приглашения в группы',
      'group_join': 'Новые участники',
      'flashcard_created': 'Новые карточки',
      'note_created': 'Новые заметки',
      'study_reminder': 'Напоминания',
      'achievement': 'Достижения',
      'system': 'Системные',
      'study_session_invite': 'Приглашение в учебную сессию'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'group_invitation': '👥',
      'group_join': '🎉',
      'flashcard_created': '📚',
      'note_created': '📝',
      'study_reminder': '⏰',
      'achievement': '🏆',
      'system': '⚙️',
      'study_session_invite': '🚀'
    };
    return icons[type] || '🔔';
  };

  const getNotificationAction = (notification: Notification) => {
    if (notification.type === 'study_session_invite' && notification.data?.sessionId) {
      return () => handleJoinStudySession(notification.data.sessionId, notification.id);
    }
    if (notification.data?.groupId) {
      return () => navigate(`/groups/${notification.data.groupId}`);
    }
    return null;
  };

  return (
    <div className="notifications-page">
      <Header />
      <div className="page-with-header">
        <div className="notifications-container">
          <div className="breadcrumb">
            <Link to="/dashboard">Главная</Link> / <span>Уведомления</span>
          </div>
          
          <div className="page-header">
            <h1>Уведомления</h1>
            <p>Ваши уведомления и оповещения</p>
          </div>

          {stats && (
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon">📬</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.total}</div>
                  <div className="stat-label">Всего</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔔</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.unread}</div>
                  <div className="stat-label">Непрочитанных</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-number">{stats.read}</div>
                  <div className="stat-label">Прочитанных</div>
                </div>
              </div>
            </div>
          )}

          <div className="notifications-controls">
            <div className="filters">
              <div className="filter-group">
                <label>Тип:</label>
                <select
                  value={filter.type}
                  onChange={(e) => handleFilterChange({ type: e.target.value })}
                >
                  <option value="all">Все типы</option>
                  <option value="group_invitation">Приглашения в группы</option>
                  <option value="group_join">Новые участники</option>
                  <option value="flashcard_created">Новые карточки</option>
                  <option value="note_created">Новые заметки</option>
                  <option value="study_reminder">Напоминания</option>
                  <option value="achievement">Достижения</option>
                  <option value="system">Системные</option>
                  <option value="study_session_invite">Приглашения в сессии</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Статус:</label>
                <select
                  value={filter.read}
                  onChange={(e) => handleFilterChange({ read: e.target.value })}
                >
                  <option value="all">Все</option>
                  <option value="false">Непрочитанные</option>
                  <option value="true">Прочитанные</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Поиск:</label>
                <input
                  type="text"
                  placeholder="Поиск по уведомлениям..."
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            <div className="actions">
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={stats?.unread === 0}
              >
                Отметить все как прочитанные
              </Button>
              
              {selectedNotifications.length > 0 && (
                <div className="bulk-actions">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                  >
                    <option value="read">Отметить как прочитанные</option>
                    <option value="archive">Архивировать</option>
                    <option value="delete">Удалить</option>
                  </select>
                  <Button
                    variant="primary"
                    onClick={handleBulkAction}
                  >
                    Применить ({selectedNotifications.length})
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="notifications-list">
            {loading && notifications.length === 0 ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Загрузка уведомлений...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Уведомлений не найдено</h3>
                <p>Попробуйте изменить фильтры</p>
              </div>
            ) : (
              <>
                {filteredNotifications.map((notification) => {
                  const actionHandler = getNotificationAction(notification);
                  return (
                    <div
                      key={notification.id}
                      className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
                    >
                      <div className="notification-select">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={() => toggleSelectNotification(notification.id)}
                        />
                      </div>
                      
                      <div className="notification-icon">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="notification-content">
                        <div className="notification-header">
                          <h3 className="notification-title">
                            {notification.title}
                            <span className="notification-type">
                              {getTypeLabel(notification.type)}
                            </span>
                          </h3>
                          <div className="notification-meta">
                            <span className="notification-time">{notification.formattedDate}</span>
                            {!notification.isRead && (
                              <span className="unread-badge">Новое</span>
                            )}
                          </div>
                        </div>
                        
                        <p className="notification-message">{notification.message}</p>
                        
                        {notification.data && Object.keys(notification.data).length > 0 && (
                          <div className="notification-data">
                            {notification.data.groupName && (
                              <div className="data-item">
                                <strong>Группа:</strong> {notification.data.groupName}
                              </div>
                            )}
                            {notification.data.author && (
                              <div className="data-item">
                                <strong>Автор:</strong> {notification.data.author.name}
                              </div>
                            )}
                            {notification.data.sessionName && (
                              <div className="data-item">
                                <strong>Сессия:</strong> {notification.data.sessionName}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="notification-actions">
                          {!notification.isRead ? (
                            <button
                              className="action-btn read-btn"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              ✓ Прочитано
                            </button>
                          ) : (
                            <button
                              className="action-btn unread-btn"
                              onClick={() => handleMarkAsUnread(notification.id)}
                            >
                              ✗ Непрочитано
                            </button>
                          )}
                          
                          <button
                            className="action-btn archive-btn"
                            onClick={() => handleArchive(notification.id)}
                          >
                            📁 Архив
                          </button>
                          
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(notification.id)}
                          >
                            🗑️ Удалить
                          </button>
                          
                          {actionHandler && (
                            <button
                              className="action-btn view-btn"
                              onClick={() => actionHandler()}
                            >
                              👁️ Перейти
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {hasMore && (
                  <div className="load-more">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={loading}
                    >
                      {loading ? 'Загрузка...' : 'Загрузить еще'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="notifications-help">
            <h3>📋 Справка по уведомлениям</h3>
            <ul>
              <li><strong>Приглашения в группы:</strong> Когда вас приглашают в учебную группу</li>
              <li><strong>Новые участники:</strong> Кто-то присоединился к вашей группе</li>
              <li><strong>Новые карточки:</strong> Созданы новые карточки в ваших группах</li>
              <li><strong>Новые заметки:</strong> Добавлены новые заметки в ваших группах</li>
              <li><strong>Напоминания:</strong> Время повторять изученные карточки</li>
              <li><strong>Достижения:</strong> Вы получили новое достижение</li>
              <li><strong>Системные:</strong> Важные системные уведомления</li>
              <li><strong>Приглашения в сессии:</strong> Вас пригласили в учебную сессию</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;