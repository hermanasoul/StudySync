import React from 'react';
import Header from '../components/Header';
import './PublicGroupsPage.css';

const PublicGroupsPage: React.FC = () => {
  return (
    <div className="public-groups-page">
      <Header />
      
      <div className="public-groups-container">
        <div className="page-header">
          <h1>Публичные группы</h1>
          <p>Присоединяйтесь к открытым учебным группам</p>
        </div>
        <div className="coming-soon">
          <div className="coming-soon-icon">👥</div>
          <h3>Скоро здесь появятся публичные группы</h3>
          <p>В этом разделе вы сможете просматривать и присоединяться к публичным учебным группам, созданным другими пользователями.</p>
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <span>Поиск групп по предметам</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>Просмотр участников</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📚</span>
              <span>Доступ к общим материалам</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicGroupsPage;
