import React from 'react';
import './PracticeTab.css';

const Stats = ({ stats, total }) => {
  return (
    <div className="stats-container">
      <div>Tổng câu: <strong>{total}</strong></div>
      <div>Đã trả lời: <strong>{stats.answered}</strong></div>
      <div className="stat-correct">Đúng: <strong>{stats.correct}</strong></div>
      <div className="stat-incorrect">Sai: <strong>{stats.incorrect}</strong></div>
    </div>
  );
};

export default Stats;