// client/src/pages/StudyHistoryPage.tsx

import React from 'react';
import Header from '../components/Header';
import './StudyHistoryPage.css';

const StudyHistoryPage: React.FC = () => {
  return (
    <div className="study-history-page">
      <Header />
      <div className="page-with-header">
        <h1>История учебных сессий</h1>
        <p>В разработке. Здесь будет ваша история.</p>
      </div>
    </div>
  );
};

export default StudyHistoryPage;