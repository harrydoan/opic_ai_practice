import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

// Hàm tạo prompt mới theo yêu cầu của bạn
const createNewPrompt = (sentence) => {
  // Thay thế câu ví dụ bằng câu thực tế
  return `Given the sentence: "${sentence}"

1. Randomly hide one word using a blank (____).
2. Provide four multiple choice options (A, B, C, D), with only one correct answer (the original word). The other three options should be plausible but incorrect.
3. Then, explain the grammar of the missing word in Vietnamese (its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Do not include any explanations or extra text beyond the requested content.`;
};

// HÀM MỚI: Phân tích văn bản thô trả về từ AI
const parseAIResponse = (rawText, originalSentence) => {
  const lines = rawText.split('\n').filter(line => line.trim() !== '');

  const question_sentence = lines[0] || '';
  
  const options = [];
  const optionLines = lines.slice(1, 5);
  const optionRegex = /^[A-D]\.\s(.+)/;
  for (const line of optionLines) {
    const match = line.match(optionRegex);
    if (match) {
      options.push(match[1].trim());
    }
  }

  // Suy luận đáp án đúng bằng cách thử điền các lựa chọn vào chỗ trống
  let correct_answer = '';
  for (const option of options) {
    if (question_sentence.replace('____', option) === originalSentence) {
      correct_answer = option;
      break;
    }
  }
  
  // Nếu không suy luận được (do AI che từ có dấu câu), lấy đáp án là từ bị thiếu
  if (!correct_answer) {
      const originalWords = originalSentence.split(' ');
      const questionWords = question_sentence.replace('____', 'PLACEHOLDER').split(' ');
      const missingWord = originalWords.find(word => !questionWords.includes(word));
      if (missingWord) correct_answer = missingWord.replace(/[.,]/g, '');
  }

  const grammar_explanation = lines.find(line => line.toLowerCase().includes('ngữ pháp:'))?.substring(9).trim() || lines[5] || '';
  const translation = lines.find(line => line.toLowerCase().includes('dịch:'))?.substring(5).trim() || lines[6] || '';

  return {
    question_sentence,
    options: options.sort(() => Math.random() - 0.5), // Luôn xáo trộn đáp án
    correct_answer: correct_answer.toLowerCase(),
    grammar_explanation,
    translation,
  };
};

const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const fetchAndProcessQuestion = useCallback(async () => {
    if (sentenceData.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsAnswered(false);
    
    try {
      // 1. Chọn ngẫu nhiên một câu văn gốc
      const randomIndex = Math.floor(Math.random() * sentenceData.length);
      const sentenceObject = sentenceData[randomIndex];
      const originalSentence = sentenceObject.originalText;

      // 2. Gửi prompt mới đến AI
      const prompt = createNewPrompt(originalSentence);
      const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
      
      // 3. Phân tích văn bản thô và tạo đối tượng câu hỏi
      const questionData = parseAIResponse(rawResponse, originalSentence);
      
      setCurrentQuestion(questionData);
    } catch (error) {
      console.error("Failed to process question:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sentenceData, selectedModel]);

  // Tải câu hỏi đầu tiên
  useEffect(() => {
    fetchAndProcessQuestion();
  }, [fetchAndProcessQuestion]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };
  
  const handleNextQuestion = () => {
    // Chỉ cần gọi lại hàm để lấy một câu hỏi ngẫu nhiên mới
    fetchAndProcessQuestion();
  };
  
  if (isLoading) {
    return (
      <div className="processing-container">
        <div className="spinner"></div>
        <h4>AI is generating the next question...</h4>
      </div>
    );
  }
  if (!currentQuestion) {
    return <p>Không có câu hỏi nào để hiển thị. Vui lòng kiểm tra lại tab 'Nhập liệu'.</p>;
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