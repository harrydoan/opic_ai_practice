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

// HÀM PHÂN TÍCH DỮ LIỆU ĐÃ ĐƯỢC LÀM LẠI HOÀN TOÀN
const parseAIResponse = (rawText, originalSentence) => {
  const normalizeString = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  const lines = rawText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 5) return null; // Cần ít nhất 1 câu hỏi, 4 đáp án

  let question_sentence = '';
  const options = [];
  let grammar_explanation = '';
  let translation = '';

  const optionRegex = /^[A-D][\.\)]\s(.+)/i;

  // Quét toàn bộ các dòng để tìm các thành phần
  for (const line of lines) {
    const trimmedLine = line.trim();
    const optionMatch = trimmedLine.match(optionRegex);

    if (optionMatch && options.length < 4) {
      options.push(optionMatch[1].trim());
    } else if (trimmedLine.includes('____') && !question_sentence) {
      question_sentence = trimmedLine;
    } else if (trimmedLine.toLowerCase().startsWith('ngữ pháp:')) {
      grammar_explanation = trimmedLine.substring(9).trim();
    } else if (trimmedLine.toLowerCase().startsWith('dịch:')) {
      translation = trimmedLine.substring(5).trim();
    }
  }

  // Nếu không tìm thấy câu hỏi, lấy dòng đầu tiên
  if (!question_sentence) {
    question_sentence = lines[0];
  }

  // Nếu không tìm thấy giải thích, thử lấy các dòng cuối
  if (!grammar_explanation && lines.length > options.length + 1) {
    grammar_explanation = lines[options.length + 1];
  }
  if (!translation && lines.length > options.length + 2) {
    translation = lines[options.length + 2];
  }

  // Nếu không đủ 4 lựa chọn, coi như phân tích thất bại
  if (options.length < 4) return null;

  // Suy luận đáp án đúng
  let correct_answer = '';
  const normalizedOriginalSentence = normalizeString(originalSentence);
  for (const option of options) {
    const reconstructedSentence = question_sentence.replace('____', option);
    if (normalizeString(reconstructedSentence) === normalizedOriginalSentence) {
      correct_answer = option;
      break;
    }
  }
  
  if (!correct_answer) {
    console.warn("Could not deduce correct answer. The AI might have changed the sentence structure.");
    return null; // Phân tích thất bại nếu không tìm được đáp án đúng
  }

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
  const [error, setError] = useState(null); // State mới để quản lý lỗi

  const fetchAndProcessQuestion = useCallback(async () => {
    if (sentenceData.length === 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsAnswered(false);
    setError(null); // Xóa lỗi cũ
    
    try {
      const randomIndex = Math.floor(Math.random() * sentenceData.length);
      const sentenceObject = sentenceData[randomIndex];
      const originalSentence = sentenceObject.originalText;

      const prompt = createNewPrompt(originalSentence);
      const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
      
      const questionData = parseAIResponse(rawResponse, originalSentence);
      
      if (questionData) {
        setCurrentQuestion(questionData);
      } else {
        throw new Error("Failed to parse AI response. The format might be incorrect.");
      }

    } catch (err) {
      console.error("Error in fetchAndProcessQuestion:", err);
      setError(err.message); // Lưu lại lỗi để hiển thị
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

  // Giao diện hiển thị lỗi và nút thử lại
  if (error) {
    return (
        <div className="processing-container">
            <p>Rất tiếc, đã có lỗi xảy ra khi tạo câu hỏi.</p>
            <p><i>{error}</i></p>
            <Button onClick={handleNextQuestion}>Thử lại</Button>
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