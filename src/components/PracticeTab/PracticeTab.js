import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

const PracticeTab = () => {
  const { 
    fillInTheBlankQuestions, 
    setFillInTheBlankQuestions, 
    selectedModel
  } = useContext(AppContext);
  
  // Trạng thái cốt lõi
  const [masterQuestionList, setMasterQuestionList] = useState([]); // Danh sách câu hỏi gốc không bao giờ thay đổi
  const [practiceQueue, setPracticeQueue] = useState([]); // Hàng đợi câu hỏi cho vòng hiện tại
  const [currentQuestion, setCurrentQuestion] = useState(null);
  
  // Trạng thái giao diện
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Khởi tạo khi có bộ câu hỏi mới
  useEffect(() => {
    if (fillInTheBlankQuestions.length > 0) {
      // Sao chép câu hỏi vào danh sách chính để làm nguồn
      setMasterQuestionList([...fillInTheBlankQuestions]);
      // Bắt đầu vòng đầu tiên với tất cả câu hỏi
      setPracticeQueue(shuffleArray([...fillInTheBlankQuestions]));
    }
  }, [fillInTheBlankQuestions]);

  // Lấy câu hỏi tiếp theo từ hàng đợi
  useEffect(() => {
    if (practiceQueue.length > 0 && !currentQuestion) {
      const nextQueue = [...practiceQueue];
      const nextQuestion = nextQueue.shift(); // Lấy câu hỏi đầu tiên
      setCurrentQuestion(nextQuestion);
      setPracticeQueue(nextQueue);
    }
  }, [practiceQueue, currentQuestion]);


  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);

    // Lấy feedback từ AI nếu cần
    if (!currentQuestion.grammar) {
        fetchFeedbackFromAI(currentQuestion);
    }
  };

  const handleNextQuestion = () => {
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    let updatedQueue = [...practiceQueue];

    if (!isCorrect) {
      // Nếu trả lời sai, thêm câu hỏi này vào lại cuối hàng đợi để ôn tập
      updatedQueue.push(currentQuestion);
    }
    
    // Kiểm tra nếu hàng đợi trống
    if (updatedQueue.length === 0) {
        // Vòng chơi kết thúc, bắt đầu lại với tất cả câu hỏi
        updatedQueue = shuffleArray([...masterQuestionList]);
    }

    // Lấy câu hỏi tiếp theo
    const nextQuestion = updatedQueue.shift(); // Lấy phần tử đầu tiên

    // Cập nhật trạng thái cho vòng mới
    setPracticeQueue(updatedQueue);
    setCurrentQuestion(nextQuestion);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  // Hàm shuffle mảng tiện ích
  const shuffleArray = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const fetchFeedbackFromAI = async (question) => {
    // ... (Hàm này giữ nguyên, không thay đổi)
    setIsFeedbackLoading(true);
    const prompt = `The user was given the sentence: "${question.sentence}". The missing word was "${question.correctAnswer}". Provide a concise grammar explanation for why "${question.correctAnswer}" is the correct word in this context. Also, provide the Vietnamese translation of the full sentence. Format the response as a JSON object with two keys: "grammar" and "translation".`;
    
    let feedbackData;
    try {
      const result = await callOpenRouterAPI(prompt, selectedModel);
      feedbackData = JSON.parse(result);
    } catch (error) {
      feedbackData = { grammar: "AI feedback failed.", translation: "AI feedback failed." };
    }

    setCurrentQuestion(prev => (prev ? {
      ...prev,
      grammar: feedbackData.grammar,
      translation: feedbackData.translation,
      explanation: `The correct word is "${prev.correctAnswer}".`
    } : null));
    
    setIsFeedbackLoading(false);
  };

  if (!currentQuestion) {
    return <p>Loading questions or preparing next round...</p>;
  }
  
  return (
    <div className="practice-tab-container">
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
            <Button onClick={handleNextQuestion}>
              Next →
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticeTab;