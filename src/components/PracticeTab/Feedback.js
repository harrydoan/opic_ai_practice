import React from 'react';
import './PracticeTab.css';

const Feedback = ({ isCorrect, question }) => {
  return (
    <div className={`feedback-container ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
      <h4>{isCorrect ? '✅ Chính xác!' : '❌ Sai rồi!'}</h4>
      <div>
        <strong>Giải thích:</strong> {question.explanation}
      </div>
      <div>
        <strong>Ngữ pháp:</strong> {question.grammar}
      </div>
      <div>
        <strong>Dịch nghĩa:</strong> {question.translation}
      </div>
    </div>
  );
};

export default Feedback;