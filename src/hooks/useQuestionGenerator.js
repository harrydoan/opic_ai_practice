import { useState } from 'react';

// --- CẢI TIẾN 1: Ngân hàng từ gây nhiễu (distractors) được phân loại ---
const distractors = {
  prepositions: ['on', 'at', 'with', 'from', 'for', 'about', 'over', 'under', 'by'],
  articles: ['a', 'an', 'the'],
  conjunctions: ['and', 'but', 'or', 'so', 'because', 'while', 'if', 'although'],
  verbsToBe: ['is', 'are', 'was', 'were', 'be', 'being', 'been'],
  modalVerbs: ['can', 'could', 'will', 'would', 'may', 'might', 'should', 'must'],
  pronouns: ['he', 'she', 'it', 'they', 'we', 'you', 'I', 'me', 'him', 'her'],
};

// Hàm tìm loại từ để chọn đúng nhóm từ gây nhiễu
const getWordType = (word) => {
  for (const type in distractors) {
    if (distractors[type].includes(word.toLowerCase())) {
      return type;
    }
  }
  return null;
};

// Hàm shuffle mảng
const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

const useQuestionGenerator = () => {
  const [fillInTheBlankQuestions, setFillInTheBlankQuestions] = useState([]);
  const [orderingQuestions, setOrderingQuestions] = useState([]);

  const generateQuestions = (sentences) => {
    const fillQuestions = [];
    sentences.forEach((sentence, sentenceIndex) => {
      const words = sentence.split(' ').filter(w => w.length >= 2 && !/[.,]/.test(w));
      const wordsToBlank = shuffleArray(words).slice(0, 2);

      wordsToBlank.forEach((word, questionIndex) => {
        const correctAnswer = word.toLowerCase();
        const questionText = sentence.replace(new RegExp(`\\b${word}\\b`), "<span class='blank'>_____</span>");

        // --- CẢI TIẾN 2: Logic tạo đáp án sai thông minh hơn ---
        let wrongOptions = [];
        const wordType = getWordType(correctAnswer);

        if (wordType) {
          // Nếu từ thuộc loại đã định nghĩa (giới từ, mạo từ...), lấy từ cùng loại
          wrongOptions = shuffleArray(distractors[wordType]).filter(opt => opt !== correctAnswer);
        } else {
          // Nếu là từ thông thường, tạo biến thể
          if (correctAnswer.endsWith('s')) wrongOptions.push(correctAnswer.slice(0, -1));
          else wrongOptions.push(correctAnswer + 's');

          if (correctAnswer.endsWith('ed')) wrongOptions.push(correctAnswer.slice(0, -2));
          else wrongOptions.push(correctAnswer + 'ed');

          if (correctAnswer.endsWith('ing')) wrongOptions.push(correctAnswer.slice(0, -3));
          else wrongOptions.push(correctAnswer + 'ing');
        }

        // Lọc trùng lặp và đảm bảo đủ 3 đáp án sai
        wrongOptions = [...new Set(wrongOptions)];
        while (wrongOptions.length < 3) {
            // Thêm từ ngẫu nhiên nếu không đủ
            const randomType = Object.keys(distractors)[Math.floor(Math.random() * Object.keys(distractors).length)];
            const randomWord = distractors[randomType][Math.floor(Math.random() * distractors[randomType].length)];
            if(randomWord !== correctAnswer && !wrongOptions.includes(randomWord)) {
                wrongOptions.push(randomWord);
            }
        }

        const finalOptions = shuffleArray([correctAnswer, ...wrongOptions.slice(0, 3)]);

        fillQuestions.push({
          id: `${sentenceIndex}-${questionIndex}`,
          sentence: sentence,
          question: questionText,
          correctAnswer: correctAnswer,
          options: finalOptions,
          // Xóa phần giải thích và dịch, vì sẽ lấy từ AI
          explanation: '',
          grammar: '',
          translation: ''
        });
      });
    });
    setFillInTheBlankQuestions(shuffleArray(fillQuestions));

    // Logic tạo câu hỏi sắp xếp (giữ nguyên)
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
        explanation: `This sentence is at position ${correctPosition} in the original paragraph.`
      };
    });
    setOrderingQuestions(shuffleArray(orderQuestions));
  };

  return { fillInTheBlankQuestions, setFillInTheBlankQuestions, orderingQuestions, generateQuestions };
};

export default useQuestionGenerator;