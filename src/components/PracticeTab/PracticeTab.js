import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

const createNewPrompt = (sentence) => {
  return `Given the sentence: "${sentence}"

1. Randomly hide one word using a blank (____).
2. Provide four multiple choice options (A, B, C, D), with only one correct answer (the original word). The other three options should be plausible but incorrect.
3. Then, explain the grammar of the missing word in Vietnamese (its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Do not include any explanations or extra text beyond the requested content.`;
};

// HÀM MỚI: Phân tích văn bản thô trả về từ AI
const parseAIResponse = (rawText, originalSentence) => {
  // BƯỚC 1: HÀM TIỆN ÍCH ĐỂ CHUẨN HÓA CHUỖI
  // Chuyển về chữ thường và loại bỏ các ký tự không phải chữ/số
  const normalizeString = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '');

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

  // BƯỚC 2: SUY LUẬN ĐÁP ÁN ĐÚNG BẰNG CÁCH SO SÁNH CHUỖI ĐÃ CHUẨN HÓA
  let correct_answer = '';
  const normalizedOriginalSentence = normalizeString(originalSentence);
  
  for (const option of options) {
    const reconstructedSentence = question_sentence.replace('____', option);
    if (normalizeString(reconstructedSentence) === normalizedOriginalSentence) {
      correct_answer = option;
      break;
    }
  }
  
  // Fallback: nếu vẫn không tìm thấy, thử tìm từ bị thiếu
  if (!correct_answer && options.length > 0) {
      const originalWords = originalSentence.split(' ').map(normalizeString);
      const questionWords = question_sentence.replace('____', 'PLACEHOLDER').split(' ').map(normalizeString);
      const missingWord = originalWords.find(word => !questionWords.includes(word));
      if (missingWord) {
          // Tìm lựa chọn gần giống nhất với từ bị thiếu
          const foundOption = options.find(opt => normalizeString(opt) === missingWord);
          if (foundOption) correct_answer = foundOption;
      }
  }
  
  // Nếu vẫn không có, lấy tạm lựa chọn đầu tiên để tránh lỗi
  if (!correct_answer && options.length > 0) {
      console.warn("Could not deduce correct answer. Defaulting to first option.");
      correct_answer = options[0];
  }

  const grammar_explanation = lines.find(line => line.toLowerCase().includes('ngữ pháp:'))?.substring(9).trim() || lines[5] || '';
  const translation = lines.find(line => line.toLowerCase().includes('dịch:'))?.substring(5).trim() || lines[6] || '';

  return {
    question_sentence,
    options: options.sort(() => Math.random() - 0.5),
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
      const randomIndex = Math.floor(Math.random() * sentenceData.length);
      const sentenceObject = sentenceData[randomIndex];
      const originalSentence = sentenceObject.originalText;

      const prompt = createNewPrompt(originalSentence);
      const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
      
      const questionData = parseAIResponse(rawResponse, originalSentence);
      
      setCurrentQuestion(questionData);
    } catch (error) {
      console.error("Failed to process question:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sentenceData, selectedModel]);

  useEffect(() => {
    fetchAndProcessQuestion();
  }, [fetchAndProcessQuestion]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };
  
  const handleNextQuestion = () => {
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