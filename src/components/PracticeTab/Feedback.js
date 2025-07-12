import React from 'react';
import './PracticeTab.css';

const Feedback = ({ isCorrect, question, isLoading }) => { // <-- Nhận prop isLoading
  // --- HIỂN THỊ LOADING ---
  if (isLoading) {
    return (
      <div className="feedback-container feedback-loading">
        <div className="spinner-container">
          <div className="spinner"></div>
          <span>Loading explanation from AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`feedback-container ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
      <h4>{isCorrect ? '✅ Correct!' : '❌ Incorrect!'}</h4>
      <div>
        <strong>Explanation:</strong> {question.explanation}
      </div>
      <div>
        <strong>Grammar:</strong> {question.grammar}
      </div>
      <div>
        <strong>Translation:</strong> {question.translation}
      </div>
    </div>
  );
};

export default Feedback;