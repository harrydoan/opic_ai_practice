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
  const { 
    fillInTheBlankQuestions, 
    setFillInTheBlankQuestions, 
    selectedModel,
    regenerateQuestion // Lấy hàm mới từ context
  } = useContext(AppContext);
  
  // State quản lý câu hỏi
  const [mainQueue, setMainQueue] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  
  // State quản lý trạng thái trả lời
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Khởi tạo vòng lặp
  useEffect(() => {
    if (fillInTheBlankQuestions.length > 0) {
      setMainQueue([...fillInTheBlankQuestions]);
      setReviewQueue([]);
      setCurrentQuestion(fillInTheBlankQuestions[0]);
    }
  }, [fillInTheBlankQuestions]);

  // Logic chọn câu hỏi tiếp theo
  const pickNextQuestion = useCallback(() => {
    let nextQuestion = null;
    let nextMainQueue = [...mainQueue];
    let nextReviewQueue = [...reviewQueue];

    // Ưu tiên 70% lấy từ hàng đợi ôn tập (reviewQueue) nếu có
    if (nextReviewQueue.length > 0 && Math.random() < 0.7) {
      nextQuestion = nextReviewQueue.shift(); // Lấy và xóa phần tử đầu tiên
    } else if (nextMainQueue.length > 0) {
      nextQuestion = nextMainQueue.shift();
    } else if (nextReviewQueue.length > 0) {
      // Nếu mainQueue hết thì lấy nốt trong reviewQueue
      nextQuestion = nextReviewQueue.shift();
    } else {
      // Nếu tất cả đã xong, bắt đầu lại từ đầu
      nextMainQueue = [...fillInTheBlankQuestions];
      nextQuestion = nextMainQueue.shift();
    }

    // Nếu câu hỏi được chọn đã từng trả lời đúng -> làm mới nó
    if (nextQuestion && nextQuestion.answeredCorrectly) {
      const newVersion = regenerateQuestion(
        nextQuestion.sentence, 
        nextQuestion.originalSentenceIndex, 
        [nextQuestion.correctAnswer] // Loại trừ từ đã hỏi
      );
      if (newVersion) {
        nextQuestion = newVersion;
      }
    }
    
    setCurrentQuestion(nextQuestion);
    setMainQueue(nextMainQueue);
    setReviewQueue(nextReviewQueue);
    setIsAnswered(false);
    setSelectedAnswer(null);

  }, [mainQueue, reviewQueue, fillInTheBlankQuestions, regenerateQuestion]);


  const fetchFeedbackFromAI = async (question) => {
    setIsFeedbackLoading(true);
    const prompt = `The user was given the sentence: "${question.sentence}". The missing word was "${question.correctAnswer}". Provide a concise grammar explanation for why "${question.correctAnswer}" is the correct word in this context. Also, provide the Vietnamese translation of the full sentence. Format the response as a JSON object with two keys: "grammar" and "translation".`;
    
    let feedbackData;
    try {
      const result = await callOpenRouterAPI(prompt, selectedModel);
      feedbackData = JSON.parse(result);
    } catch (error) {
      feedbackData = { grammar: "AI feedback failed.", translation: "AI feedback failed." };
    }

    // Cập nhật câu hỏi hiện tại với feedback
    setCurrentQuestion(prev => ({
      ...prev,
      grammar: feedbackData.grammar,
      translation: feedbackData.translation,
      explanation: `The correct word is "${prev.correctAnswer}".`
    }));
    
    setIsFeedbackLoading(false);
  };

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      // Đánh dấu đã trả lời đúng và thêm vào cuối hàng đợi chính
      const masteredQuestion = { ...currentQuestion, answeredCorrectly: true };
      setMainQueue(prev => [...prev, masteredQuestion]);
    } else {
      // Thêm vào hàng đợi ôn tập
      setReviewQueue(prev => [...prev, currentQuestion]);
    }

    if (!currentQuestion.grammar) {
      fetchFeedbackFromAI(currentQuestion);
    }
  };
  
  if (!currentQuestion) {
    return <p>Loading questions...</p>;
  }
  
  return (
    <div className="practice-tab-container">
      {/* Có thể thêm lại Stats và ProgressBar nếu muốn */}
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
          
          {!isFeedbackLoading && (
            <Button onClick={pickNextQuestion}>
              Next Question →
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticeTab;