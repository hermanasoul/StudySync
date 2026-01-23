// client/src/components/Notifications.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import webSocketService from '../services/websocket';
import './Notifications.css';

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

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Подписываемся на WebSocket события
    const handleNewNotification = (notification: Notification) => {
      console.log('New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Показываем всплывающее уведомление (опционально)
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png',
        });
      }
    };
    
    const handleNotificationStats = (data: { unreadCount: number }) => {
      console.log('Notification stats updated:', data.unreadCount);
      setUnreadCount(data.unreadCount);
    };

    webSocketService.on('notification', handleNewNotification);
    webSocketService.on('notification-stats', handleNotificationStats);
    
    // Запрашиваем разрешение на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Запрашиваем статистику уведомлений через WebSocket
    webSocketService.send('get-notification-stats');
    
    // Закрытие при клике вне компонента
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    // Обновляем уведомления каждые 30 секунд
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);
    
    return () => {
      webSocketService.off('notification', handleNewNotification);
      webSocketService.off('notification-stats', handleNotificationStats);
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll({ limit: 5 });
      if (response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      setIsOpen(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    
    // Навигация в зависимости от типа уведомления
    if (notification.data?.groupId) {
      window.location.href = `/groups/${notification.data.groupId}`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return '👥';
      case 'group_join':
        return '🎉';
      case 'flashcard_created':
        return '📚';
      case 'note_created':
        return '📝';
      case 'study_reminder':
        return '⏰';
      case 'achievement':
        return '🏆';
      case 'system':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'group_invitation':
        return 'notification-group-invitation';
      case 'group_join':
        return 'notification-group-join';
      case 'flashcard_created':
        return 'notification-flashcard-created';
      case 'note_created':
        return 'notification-note-created';
      case 'study_reminder':
        return 'notification-study-reminder';
      case 'achievement':
        return 'notification-achievement';
      case 'system':
        return 'notification-system';
      default:
        return '';
    }
  };

  return (
    <div className="notifications-container" ref={notificationRef}>
      <button
        className="notifications-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Уведомления"
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Уведомления</h3>
            <div className="notifications-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={handleMarkAllAsRead}
                  title="Отметить все как прочитанные"
                >
                  Отметить все как прочитанные
                </button>
              )}
              <Link to="/notifications" onClick={() => setIsOpen(false)}>
                Все уведомления
              </Link>
            </div>
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="loading-notifications">
                <div className="spinner"></div>
                <p>Загрузка уведомлений...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <div className="empty-icon">📭</div>
                <p>У вас пока нет уведомлений</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${getNotificationClass(notification.type)} ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      {!notification.isRead && (
                        <span className="unread-dot"></span>
                      )}
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    <div className="notification-footer">
                      <span className="notification-time">{notification.formattedDate}</span>
                      {!notification.isRead && (
                        <button
                          className="mark-read-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          title="Отметить как прочитанное"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notifications-footer">
            <Link to="/notifications" onClick={() => setIsOpen(false)}>
              Показать все уведомления
            </Link>
            <Link to="/notifications?settings" onClick={() => setIsOpen(false)}>
              Настройки уведомлений
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;