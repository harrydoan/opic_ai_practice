import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Stats from './Stats';
import Question from './Question';
import Feedback from './Feedback';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';
import './PracticeTab.css';

const PracticeTab = () => {
  const { fillInTheBlankQuestions, setFillInTheBlankQuestions, selectedModel } = useContext(AppContext);
  
  const [questionOrder, setQuestionOrder] = useState([]);
  const [currentQuestionPointer, setCurrentQuestionPointer] = useState(0);
  const [answeredInRound, setAnsweredInRound] = useState(0);

  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
  const [wrongAnswerIndices, setWrongAnswerIndices] = useState([]);

  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Hàm khởi tạo hoặc reset vòng chơi
  const startNewRound = useCallback((indices) => {
    setQuestionOrder(indices);
    setCurrentQuestionPointer(0);
    setAnsweredInRound(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
  }, []);
  
  // Khởi tạo lần đầu khi câu hỏi được nạp
  useEffect(() => {
    if (fillInTheBlankQuestions.length > 0) {
      const initialIndices = Array.from(Array(fillInTheBlankQuestions.length).keys());
      startNewRound(initialIndices);
      setStats({ correct: 0, incorrect: 0 });
      setWrongAnswerIndices([]);
    }
  }, [fillInTheBlankQuestions, startNewRound]);

  const currentQuestionIndex = questionOrder[currentQuestionPointer];
  const currentQuestion = fillInTheBlankQuestions[currentQuestionIndex];

  const fetchFeedbackFromAI = async (question, index) => {
    setIsFeedbackLoading(true);
    const prompt = `The user was given the sentence: "${question.sentence}". The missing word was "${question.correctAnswer}". Provide a concise grammar explanation for why "${question.correctAnswer}" is the correct word in this context. Also, provide the Vietnamese translation of the full sentence. Format the response as a JSON object with two keys: "grammar" and "translation". Example: {"grammar": "Explanation here...", "translation": "Translation here..."}`;
    
    let feedbackData;
    try {
      const result = await callOpenRouterAPI(prompt, selectedModel);
      feedbackData = JSON.parse(result);
    } catch (error) {
      console.error("Failed to parse feedback from AI:", error);
      feedbackData = {
        grammar: "Could not load grammar from AI.",
        translation: "Could not load translation from AI.",
      };
    }

    // FIX: Dùng functional update để tránh state cũ (stale state)
    setFillInTheBlankQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      newQuestions[index] = {
        ...newQuestions[index],
        grammar: feedbackData.grammar,
        translation: feedbackData.translation,
        explanation: `The correct word is "${newQuestions[index].correctAnswer}".`
      };
      return newQuestions;
    });
    
    setIsFeedbackLoading(false);
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
      // Thêm chỉ số của câu sai vào danh sách, không trùng lặp
      setWrongAnswerIndices(prev => [...new Set([...prev, currentQuestionIndex])]);
    }

    // Chỉ gọi AI để lấy feedback nếu câu hỏi đó chưa có feedback
    if (!currentQuestion.grammar && !currentQuestion.translation) {
      fetchFeedbackFromAI(currentQuestion, currentQuestionIndex);
    }
  };

  const handleNextQuestion = () => {
    const nextPointer = currentQuestionPointer + 1;
    setAnsweredInRound(prev => prev + 1);

    // NEW LOGIC: Logic chuyển câu hỏi mới
    if (nextPointer < questionOrder.length) {
      // Nếu chưa hết vòng, đi đến câu tiếp theo
      setCurrentQuestionPointer(nextPointer);
      setIsAnswered(false);
      setSelectedAnswer(null);
    } else {
      // Nếu đã hết vòng
      if (wrongAnswerIndices.length > 0) {
        // Bắt đầu vòng ôn tập với những câu sai
        alert(`Round complete! Now starting a review round with ${wrongAnswerIndices.length} incorrect answers.`);
        startNewRound(wrongAnswerIndices);
        setWrongAnswerIndices([]); // Xóa danh sách câu sai để chuẩn bị cho vòng sau
      } else {
        // Nếu không có câu sai, chơi lại từ đầu
        alert("Excellent! You answered all questions correctly. Let's start over!");
        const allIndices = Array.from(Array(fillInTheBlankQuestions.length).keys());
        startNewRound(allIndices);
      }
    }
  };
  
  if (!currentQuestion) {
    return <p>Loading questions or round complete...</p>;
  }
  
  return (
    <div className="practice-tab-container">
      <Stats stats={{...stats, answered: answeredInRound}} total={questionOrder.length} />
      <ProgressBar value={answeredInRound} max={questionOrder.length} />
      
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
            isLoading={isFeedbackLoading}
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