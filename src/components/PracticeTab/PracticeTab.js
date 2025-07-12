import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI'; // Import API call
import Stats from './Stats';
import Question from './Question';
import Feedback from './Feedback';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';
import './PracticeTab.css';

const PracticeTab = () => {
  const { fillInTheBlankQuestions, setFillInTheBlankQuestions } = useContext(AppContext);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [stats, setStats] = useState({ answered: 0, correct: 0, incorrect: 0 });
  const [wrongAnswerQueue, setWrongAnswerQueue] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false); // <-- State mới cho loading feedback

  const questionOrder = useMemo(() => {
    return Array.from(Array(fillInTheBlankQuestions.length).keys());
  }, [fillInTheBlankQuestions]);

  const [unansweredQuestions, setUnansweredQuestions] = useState(questionOrder);

  const currentQuestion = fillInTheBlankQuestions[currentQuestionIndex];

  useEffect(() => {
    setStats({ answered: 0, correct: 0, incorrect: 0 });
    setWrongAnswerQueue([]);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setUnansweredQuestions(questionOrder);
    setCurrentQuestionIndex(questionOrder[0] || 0);
  }, [fillInTheBlankQuestions, questionOrder]);

  // --- LOGIC MỚI: Lấy giải thích và dịch từ AI ---
  const fetchFeedbackFromAI = async (question) => {
    setIsFeedbackLoading(true);
    const prompt = `The user was given the sentence: "${question.sentence}". The missing word was "${question.correctAnswer}". Provide a concise grammar explanation for why "${question.correctAnswer}" is the correct word in this context. Also, provide the Vietnamese translation of the full sentence. Format the response as a JSON object with two keys: "grammar" and "translation". Example: {"grammar": "Explanation here...", "translation": "Translation here..."}`;
    
    try {
      const result = await callOpenRouterAPI(prompt);
      const feedbackData = JSON.parse(result);

      // Cập nhật câu hỏi hiện tại với dữ liệu từ AI
      const updatedQuestions = [...fillInTheBlankQuestions];
      updatedQuestions[currentQuestionIndex] = {
        ...question,
        grammar: feedbackData.grammar,
        translation: feedbackData.translation,
        explanation: `The correct word is "${question.correctAnswer}".`
      };
      setFillInTheBlankQuestions(updatedQuestions);

    } catch (error) {
      console.error("Failed to parse feedback from AI:", error);
      // Cung cấp feedback mặc định nếu AI lỗi
      const updatedQuestions = [...fillInTheBlankQuestions];
      updatedQuestions[currentQuestionIndex] = {
        ...question,
        grammar: "Could not load grammar from AI.",
        translation: "Could not load translation from AI.",
        explanation: `The correct word is "${question.correctAnswer}".`
      };
      setFillInTheBlankQuestions(updatedQuestions);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      setWrongAnswerQueue(prev => [...prev, currentQuestionIndex]);
    }
    setStats(prev => ({...prev, answered: prev.answered + 1}));

    // Gọi AI để lấy feedback sau khi trả lời
    if (!currentQuestion.grammar) { // Chỉ gọi nếu chưa có feedback
        fetchFeedbackFromAI(currentQuestion);
    }
  };

  const handleNextQuestion = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);

    if (wrongAnswerQueue.length > 0 && Math.random() < 0.7) {
      const nextWrongIndex = wrongAnswerQueue[0];
      setWrongAnswerQueue(prev => prev.slice(1));
      setCurrentQuestionIndex(nextWrongIndex);
      return;
    }

    if (unansweredQuestions.length > 1) {
        const remaining = unansweredQuestions.filter(qIndex => qIndex !== currentQuestionIndex);
        setUnansweredQuestions(remaining);
        setCurrentQuestionIndex(remaining[0]);
    } else {
        alert("You have completed all questions! A new round will begin.");
        setUnansweredQuestions(questionOrder);
        setCurrentQuestionIndex(questionOrder[0]);
        setStats({ answered: 0, correct: 0, incorrect: 0 });
    }
  };

  if (!fillInTheBlankQuestions || fillInTheBlankQuestions.length === 0) {
    return <p>No data to practice. Please go back to the "Input" tab.</p>;
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
            isLoading={isFeedbackLoading} // <-- Truyền state loading xuống
          />
          <Button onClick={handleNextQuestion} disabled={isFeedbackLoading}>
            {isFeedbackLoading ? <div className="spinner"></div> : 'Next Question →'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;