import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import WebSocketStatus from './components/WebSocketStatus';
import AchievementNotification from './components/AchievementNotification';
import LevelUpNotification from './components/LevelUpNotification';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import NotesPage from './pages/NotesPage';
import FlashcardsPage from './pages/FlashcardsPage';
import SettingsPage from './pages/SettingsPage';
import GroupsPage from './pages/GroupsPage';
import GroupPage from './pages/GroupPage';
import ProfilePage from './pages/ProfilePage';
import PublicGroupsPage from './pages/PublicGroupsPage';
import SubjectsPage from './pages/SubjectsPage';
import NotificationsPage from './pages/NotificationsPage';
import AchievementsPage from './pages/AchievementsPage';
import LevelsPage from './pages/LevelsPage';
import FriendsPage from './pages/FriendsPage';
import ChatsPage from './pages/ChatsPage';
import './App.css';
import './styles/buttons.css';
import webSocketService from './services/websocket';

function App() {
  const [achievementNotification, setAchievementNotification] = useState<any>(null);
  const [levelUpNotification, setLevelUpNotification] = useState<any>(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    const handleAchievementNotification = (data: any) => {
      if (data.type === 'achievement') {
        setAchievementNotification({
          name: data.data.achievementName,
          icon: data.data.achievementIcon,
          description: `Вы получили достижение "${data.data.achievementName}"!`,
          points: data.data.achievementPoints,
          difficulty: data.data.achievementDifficulty
        });
        setShowAchievement(true);
      }
    };

    const handleLevelUpNotification = (data: any) => {
      if (data.type === 'level_up') {
        setLevelUpNotification({
          oldLevel: data.data.oldLevel,
          newLevel: data.data.newLevel,
          levelName: data.data.levelName,
          icon: data.data.icon,
          color: data.data.color,
          unlocks: data.data.unlocks
        });
        setShowLevelUp(true);
      }
    };

    webSocketService.on('notification', handleAchievementNotification);
    webSocketService.on('notification', handleLevelUpNotification);

    return () => {
      webSocketService.off('notification', handleAchievementNotification);
      webSocketService.off('notification', handleLevelUpNotification);
    };
  }, []);

  const handleCloseAchievement = () => {
    setShowAchievement(false);
    setAchievementNotification(null);
  };

  const handleCloseLevelUp = () => {
    setShowLevelUp(false);
    setLevelUpNotification(null);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Защищенные маршруты */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/public-groups" element={
              <ProtectedRoute>
                <PublicGroupsPage />
              </ProtectedRoute>
            } />
            <Route path="/subjects" element={
              <ProtectedRoute>
                <SubjectsPage />
              </ProtectedRoute>
            } />
            <Route path="/flashcards" element={
              <ProtectedRoute>
                <FlashcardsPage />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/achievements" element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            } />
            <Route path="/levels" element={
              <ProtectedRoute>
                <LevelsPage />
              </ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute>
                <FriendsPage />
              </ProtectedRoute>
            } />
            <Route path="/chats" element={
              <ProtectedRoute>
                <ChatsPage />
              </ProtectedRoute>
            } />
            <Route path="/subjects/:subjectId" element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            } />
            <Route path="/subjects/:subjectId/flashcards" element={
              <ProtectedRoute>
                <FlashcardsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/groups" element={
              <ProtectedRoute>
                <GroupsPage />
              </ProtectedRoute>
            } />
            <Route path="/groups/:groupId" element={
              <ProtectedRoute>
                <GroupPage />
              </ProtectedRoute>
            } />
          </Routes>
          
          {/* Компонент статуса WebSocket */}
          <WebSocketStatus />
          
          {/* Уведомление о получении достижения */}
          {showAchievement && achievementNotification && (
            <AchievementNotification
              achievement={achievementNotification}
              onClose={handleCloseAchievement}
            />
          )}
          
          {/* Уведомление о повышении уровня */}
          {showLevelUp && levelUpNotification && (
            <LevelUpNotification
              levelUp={levelUpNotification}
              onClose={handleCloseLevelUp}
            />
          )}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;