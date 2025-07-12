import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import Stats from './Stats';
import Question from './Question';
import Feedback from './Feedback';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';
import './PracticeTab.css';

const PracticeTab = () => {
  const { fillInTheBlankQuestions } = useContext(AppContext);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stats, setStats] = useState({ answered: 0, correct: 0, incorrect: 0 });
  const [wrongAnswerQueue, setWrongAnswerQueue] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const questionOrder = useMemo(() => {
    return Array.from(Array(fillInTheBlankQuestions.length).keys());
  }, [fillInTheBlankQuestions]);

  const [unansweredQuestions, setUnansweredQuestions] = useState(questionOrder);

  const currentQuestion = fillInTheBlankQuestions[currentQuestionIndex];

  useEffect(() => {
    // Reset state when questions change
    setStats({ answered: 0, correct: 0, incorrect: 0 });
    setWrongAnswerQueue([]);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setUnansweredQuestions(questionOrder);
    setCurrentQuestionIndex(questionOrder[0] || 0);
  }, [fillInTheBlankQuestions, questionOrder]);


  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      // Thêm câu hỏi sai vào hàng đợi để ôn tập
      setWrongAnswerQueue(prev => [...prev, currentQuestionIndex]);
    }
    setStats(prev => ({...prev, answered: prev.answered + 1}));
  };

  const handleNextQuestion = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);

    // Hệ thống ôn tập thông minh
    if (wrongAnswerQueue.length > 0 && Math.random() < 0.7) {
      const nextWrongIndex = wrongAnswerQueue[0];
      setWrongAnswerQueue(prev => prev.slice(1));
      setCurrentQuestionIndex(nextWrongIndex);
      return;
    }

    // Nếu còn câu hỏi mới
    if (unansweredQuestions.length > 1) {
        const remaining = unansweredQuestions.filter(qIndex => qIndex !== currentQuestionIndex);
        setUnansweredQuestions(remaining);
        setCurrentQuestionIndex(remaining[0]);
    } else {
        // Hết câu hỏi, bắt đầu lại
        alert("Bạn đã hoàn thành tất cả câu hỏi! Vòng lặp mới sẽ bắt đầu.");
        setUnansweredQuestions(questionOrder);
        setCurrentQuestionIndex(questionOrder[0]);
        setStats({ answered: 0, correct: 0, incorrect: 0 });
    }
  };

  if (!fillInTheBlankQuestions || fillInTheBlankQuestions.length === 0) {
    return <p>Chưa có dữ liệu để luyện tập. Vui lòng quay lại tab "Nhập liệu".</p>;
  }
  
  return (
    <div className="practice-tab-container">
      <Stats stats={stats} total={fillInTheBlankQuestions.length} />
      <ProgressBar value={stats.answered} max={fillInTheBlankQuestions.length} />
      
      <Question 
        question={currentQuestion}
        onAnswerSelect={handleAnswerSelect}
        selectedAnswer={selectedAnswer}
        isAnswered={isAnswered}
      />

      {isAnswered && (
        <div className="feedback-and-next">
          <Feedback 
            isCorrect={selectedAnswer === currentQuestion.correctAnswer}
            question={currentQuestion}
          />
          <Button onClick={handleNextQuestion}>
            Câu tiếp theo →
          </Button>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;