// client/src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const token = localStorage.getItem('studysync_token');

  // Пока идёт загрузка контекста, показываем индикатор
  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  // Если нет токена — точно не аутентифицирован
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Если токен есть, но user ещё не восстановлен (редкий случай)
  if (!user) {
    return <div className="loading">Восстановление сессии...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;