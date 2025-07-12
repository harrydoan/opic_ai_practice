import React from 'react';
import './PracticeTab.css';

const Question = ({ question, onAnswerSelect, selectedAnswer, isAnswered }) => {
  
  const getButtonClass = (option) => {
    if (!isAnswered) {
      return selectedAnswer === option ? 'selected' : '';
    }
    if (option === question.correctAnswer) {
      return 'correct';
    }
    if (option === selectedAnswer) {
      return 'incorrect';
    }
    return 'disabled';
  };

  return (
    <div className="question-container">
      <p className="question-text" dangerouslySetInnerHTML={{ __html: question.question }}></p>
      <div className="answers-grid">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={`answer-btn ${getButtonClass(option)}`}
            onClick={() => onAnswerSelect(option)}
            disabled={isAnswered}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Question;