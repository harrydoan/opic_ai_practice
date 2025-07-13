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

  const startNewRound = useCallback((indices) => {
    setQuestionOrder(indices);
    setCurrentQuestionPointer(0);
    setAnsweredInRound(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
  }, []);
  
  // Sửa lỗi ở đây:
  useEffect(() => {
    // Effect này chỉ nên chạy khi bộ câu hỏi thay đổi (tức là khi chúng được tải lần đầu).
    // Chúng ta sử dụng `length` làm dependency để ngăn nó chạy lại khi chỉ cập nhật feedback trong một câu hỏi.
    if (fillInTheBlankQuestions.length > 0) {
      const initialIndices = Array.from(Array(fillInTheBlankQuestions.length).keys());
      startNewRound(initialIndices);
      setStats({ correct: 0, incorrect: 0 });
      setWrongAnswerIndices([]);
    }
  }, [fillInTheBlankQuestions.length, startNewRound]);

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

    setFillInTheBlankQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      // Đảm bảo không ghi đè lên một câu hỏi không tồn tại
      if (newQuestions[index]) {
          newQuestions[index] = {
            ...newQuestions[index],
            grammar: feedbackData.grammar,
            translation: feedbackData.translation,
            explanation: `The correct word is "${newQuestions[index].correctAnswer}".`
          };
      }
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
      setWrongAnswerIndices(prev => [...new Set([...prev, currentQuestionIndex])]);
    }

    if (!currentQuestion.grammar && !currentQuestion.translation) {
      fetchFeedbackFromAI(currentQuestion, currentQuestionIndex);
    }
  };

  const handleNextQuestion = () => {
    const nextPointer = currentQuestionPointer + 1;
    setAnsweredInRound(prev => prev + 1);

    if (nextPointer < questionOrder.length) {
      setCurrentQuestionPointer(nextPointer);
      setIsAnswered(false);
      setSelectedAnswer(null);
    } else {
      if (wrongAnswerIndices.length > 0) {
        alert(`Round complete! Now starting a review round with ${wrongAnswerIndices.length} incorrect answers.`);
        startNewRound(wrongAnswerIndices);
        setWrongAnswerIndices([]);
      } else {
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
          
          {!isFeedbackLoading && (
            <Button onClick={handleNextQuestion}>
              Next Question →
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PracticeTab;