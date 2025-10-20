import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<HomePage />} />
          <Route path="/signup" element={<HomePage />} />
          <Route path="/dashboard" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
