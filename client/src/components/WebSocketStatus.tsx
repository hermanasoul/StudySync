// client/src/components/WebSocketStatus.tsx

import React, { useState, useEffect } from 'react';
import webSocketService from '../services/websocket';
import './WebSocketStatus.css';

interface Notification {
  type: 'info' | 'group' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

const WebSocketStatus: React.FC = () => {
  const [status, setStatus] = useState({
    isConnected: false,
    reconnectAttempts: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Подписка на события WebSocket
    webSocketService.on('connected', () => {
      setStatus(prev => ({ ...prev, isConnected: true }));
    });

    webSocketService.on('disconnected', () => {
      setStatus(prev => ({ ...prev, isConnected: false }));
    });

    webSocketService.on('reconnect-attempt', (attempt: number) => {
      setStatus(prev => ({ ...prev, reconnectAttempts: attempt }));
    });

    webSocketService.on('reconnected', () => {
      setStatus(prev => ({ ...prev, reconnectAttempts: 0 }));
    });

    webSocketService.on('notification', (data: any) => {
      addNotification({
        type: 'info',
        title: data.title || 'Уведомление',
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    webSocketService.on('group-notification', (data: any) => {
      addNotification({
        type: 'group',
        title: `Группа: ${data.title}`,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    // Получаем текущий статус
    setStatus(webSocketService.getStatus());

    // Очистка
    return () => {
      webSocketService.off('connected');
      webSocketService.off('disconnected');
      webSocketService.off('reconnect-attempt');
      webSocketService.off('reconnected');
      webSocketService.off('notification');
      webSocketService.off('group-notification');
    };
  }, []);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    
    // Автоматическое удаление уведомлений через 10 секунд
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== notification));
    }, 10000);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getStatusColor = () => {
    if (status.isConnected) return '#10b981'; // green
    if (status.reconnectAttempts > 0) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getStatusText = () => {
    if (status.isConnected) return 'Онлайн';
    if (status.reconnectAttempts > 0) return `Переподключение... (${status.reconnectAttempts})`;
    return 'Оффлайн';
  };

  const handleReconnect = () => {
    const token = localStorage.getItem('studysync_token');
    if (token) {
      webSocketService.connect(token);
    }
  };

  return (
    <div className="websocket-status-container">
      <div 
        className="status-indicator"
        style={{ backgroundColor: getStatusColor() }}
        title={getStatusText()}
      />
      
      {notifications.length > 0 && (
        <button 
          className="notification-badge"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          {notifications.length}
        </button>
      )}

      {showNotifications && notifications.length > 0 && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h4>Уведомления ({notifications.length})</h4>
            <button 
              className="clear-btn"
              onClick={clearNotifications}
            >
              Очистить
            </button>
            <button 
              className="close-btn"
              onClick={() => setShowNotifications(false)}
            >
              ×
            </button>
          </div>
          
          <div className="notifications-list">
            {notifications.map((notification, index) => (
              <div key={index} className={`notification-item ${notification.type}`}>
                <div className="notification-header">
                  <strong>{notification.title}</strong>
                  <span className="notification-time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!status.isConnected && status.reconnectAttempts === 0 && (
        <button 
          className="reconnect-btn"
          onClick={handleReconnect}
          title="Переподключиться"
        >
          ↻
        </button>
      )}
    </div>
  );
};

export default WebSocketStatus;