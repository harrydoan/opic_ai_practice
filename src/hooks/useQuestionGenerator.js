import { useState } from 'react';
import { grammarRules } from '../data/grammarRules';

// Hàm shuffle mảng
const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const useQuestionGenerator = () => {
  const [fillInTheBlankQuestions, setFillInTheBlankQuestions] = useState([]);
  const [orderingQuestions, setOrderingQuestions] = useState([]);

  const generateQuestions = (sentences) => {
    // --- Tạo câu hỏi điền vào chỗ trống ---
    const fillQuestions = [];
    const commonWords = ['is', 'are', 'was', 'were', 'have', 'has', 'do', 'does', 'did', 'for', 'since', 'with', 'from', 'to', 'at'];

    sentences.forEach((sentence, sentenceIndex) => {
      const words = sentence.split(' ').filter(w => w.length >= 3 && !/[.,]/.test(w));
      const wordsToBlank = shuffleArray(words).slice(0, 2); // Tạo tối đa 2 câu hỏi mỗi câu

      wordsToBlank.forEach((word, questionIndex) => {
        const correctAnswer = word.toLowerCase();
        const questionText = sentence.replace(new RegExp(`\\b${word}\\b`), "<span class='blank'>_____</span>");

        // Tạo đáp án sai
        let wrongOptions = [];
        // 1. Biến thể
        if (correctAnswer.endsWith('s')) wrongOptions.push(correctAnswer.slice(0, -1));
        else wrongOptions.push(correctAnswer + 's');
        if (correctAnswer.endsWith('ed')) wrongOptions.push(correctAnswer.slice(0, -2));
        else wrongOptions.push(correctAnswer + 'ed');
        
        // 2. Lấy từ phổ biến
        wrongOptions.push(...shuffleArray(commonWords));
        
        // Lọc trùng lặp và đảm bảo không trùng đáp án đúng
        wrongOptions = [...new Set(wrongOptions)].filter(opt => opt !== correctAnswer);
        
        // Lấy 3 đáp án sai
        const finalOptions = shuffleArray([correctAnswer, ...wrongOptions.slice(0, 3)]);

        fillQuestions.push({
          id: `${sentenceIndex}-${questionIndex}`,
          sentence: sentence,
          question: questionText,
          correctAnswer: correctAnswer,
          options: finalOptions,
          explanation: `Từ đúng là "${word}" trong câu này.`,
          grammar: grammarRules[correctAnswer] || 'Quy tắc ngữ pháp chung.',
          translation: 'Bản dịch sẽ được cập nhật sau.' // Có thể tích hợp API dịch
        });
      });
    });
    setFillInTheBlankQuestions(shuffleArray(fillQuestions));

    // --- Tạo câu hỏi sắp xếp ---
    const orderQuestions = sentences.map((sentence, index) => {
      const correctPosition = index + 1;
      let wrongPositions = [];
      while (wrongPositions.length < 3) {
        const pos = Math.floor(Math.random() * sentences.length) + 1;
        if (pos !== correctPosition && !wrongPositions.includes(pos)) {
          wrongPositions.push(pos);
        }
      }
      const options = shuffleArray([correctPosition, ...wrongPositions]);
      return {
        id: `order-${index}`,
        sentence: sentence,
        correctPosition: correctPosition,
        options: options,
        explanation: `Câu này đứng ở vị trí thứ ${correctPosition} trong đoạn văn gốc.`
      };
    });
    setOrderingQuestions(shuffleArray(orderQuestions));
  };

  return { fillInTheBlankQuestions, orderingQuestions, generateQuestions };
};

export default useQuestionGenerator;