import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

// Prompt để yêu cầu AI tạo câu hỏi hoàn chỉnh
const createQuestionPrompt = (sentence) => {
  return `Given the sentence: "${sentence}"

1. Randomly hide one word using a blank (____).
2. Provide four multiple choice options (A, B, C, D), with only one correct answer (the original word). The other three options should be plausible but incorrect.
3. Then, explain the grammar of the missing word in Vietnamese (its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Do not include any explanations or extra text beyond the requested content.`;
};

// Hàm phân tích JSON đáng tin cậy
const parseAIResponse = (rawText) => {
  try {
    const jsonMatch = rawText.match(/{[\s\S]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("JSON parsing error:", error);
    return null;
  }
};

const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [error, setError] = useState(null);

  // Logic cốt lõi: Lấy một câu ngẫu nhiên và xử lý
  const fetchRandomQuestion = useCallback(async () => {
    if (sentenceData.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsAnswered(false);
    setError(null);
    
    try {
      // BƯỚC 1: CHỌN NGẪU NHIÊN MỘT CÂU
      const randomIndex = Math.floor(Math.random() * sentenceData.length);
      const sentenceObject = sentenceData[randomIndex];
      
      // BƯỚC 2: GỬI ĐI XỬ LÝ
      const prompt = createQuestionPrompt(sentenceObject.originalText);
      const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
      const questionData = parseAIResponse(rawResponse);
      
      if (questionData) {
        // Tự sửa lỗi và xáo trộn đáp án
        const correctAnswerLower = questionData.correct_answer.toLowerCase();
        if (!questionData.options.map(o => o.toLowerCase()).includes(correctAnswerLower)) {
            questionData.options[0] = questionData.correct_answer;
        }
        questionData.options = questionData.options.sort(() => Math.random() - 0.5);
        
        // BƯỚC 3: HIỂN THỊ
        setCurrentQuestion(questionData);
      } else {
        throw new Error("AI did not return valid JSON.");
      }

    } catch (err) {
      console.error("Error fetching question:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sentenceData, selectedModel]);

  // Chỉ gọi một lần lúc đầu
  useEffect(() => {
    fetchRandomQuestion();
  }, [fetchRandomQuestion]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };
  
  // Khi nhấn Next, chỉ cần gọi lại hàm để lấy một câu ngẫu nhiên mới
  const handleNextQuestion = () => {
    fetchRandomQuestion();
  };
  
  if (isLoading) {
    return (
      <div className="processing-container">
        <div className="spinner"></div>
        <h4>AI is generating question...</h4>
      </div>
    );
  }

  if (error) {
    return (
        <div className="processing-container">
            <p>An error occurred:</p>
            <p><i>{error}</i></p>
            <Button onClick={handleNextQuestion}>Try Again</Button>
        </div>
    );
  }
  
  if (!currentQuestion) {
    return <p>No questions to display. Please check the 'Input' tab.</p>;
  }
  
  return (
    <div className="practice-tab-container">
      <Question 
        question={{
            question: currentQuestion.question_sentence,
            options: currentQuestion.options,
            correctAnswer: currentQuestion.correct_answer,
        }}
        onAnswerSelect={handleAnswerSelect}
        selectedAnswer={selectedAnswer}
        isAnswered={isAnswered}
      />
      {isAnswered && (
        <div className="feedback-and-next">
          <Feedback 
            isCorrect={selectedAnswer.toLowerCase() === currentQuestion.correct_answer.toLowerCase()}
            question={{
                explanation: `Đáp án đúng là "${currentQuestion.correct_answer}".`,
                grammar: currentQuestion.grammar_explanation,
                translation: currentQuestion.translation,
            }}
            isLoading={false}
          />
          <Button onClick={handleNextQuestion}>
            Next Question →
          </Button>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;