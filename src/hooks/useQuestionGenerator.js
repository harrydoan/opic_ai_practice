import { useState, useCallback } from 'react';

const distractors = {
  prepositions: ['on', 'at', 'with', 'from', 'for', 'about', 'over', 'under', 'by'],
  articles: ['a', 'an', 'the'],
  conjunctions: ['and', 'but', 'or', 'so', 'because', 'while', 'if', 'although'],
  verbsToBe: ['is', 'are', 'was', 'were', 'be', 'being', 'been'],
  modalVerbs: ['can', 'could', 'will', 'would', 'may', 'might', 'should', 'must'],
  pronouns: ['he', 'she', 'it', 'they', 'we', 'you', 'I', 'me', 'him', 'her'],
};

const getWordType = (word) => {
  for (const type in distractors) {
    if (distractors[type].includes(word.toLowerCase())) {
      return type;
    }
  }
  return null;
};

const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

// --- HÀM MỚI: Tạo một câu hỏi duy nhất từ một câu gốc ---
const createQuestionFromSentence = (sentence, sentenceIndex, questionIndex, wordsToExclude = []) => {
  const words = sentence.split(' ').filter(w => w.length >= 2 && !/[.,]/.test(w) && !wordsToExclude.includes(w.toLowerCase()));
  if (words.length === 0) return null; // Không còn từ nào để che

  const wordToBlank = words[Math.floor(Math.random() * words.length)];
  const correctAnswer = wordToBlank.toLowerCase();
  const questionText = sentence.replace(new RegExp(`\\b${wordToBlank}\\b`), "<span class='blank'>_____</span>");

  let wrongOptions = [];
  const wordType = getWordType(correctAnswer);

  if (wordType) {
    wrongOptions = shuffleArray(distractors[wordType]).filter(opt => opt !== correctAnswer);
  } else {
    if (correctAnswer.endsWith('s')) wrongOptions.push(correctAnswer.slice(0, -1)); else wrongOptions.push(correctAnswer + 's');
    if (correctAnswer.endsWith('ed')) wrongOptions.push(correctAnswer.slice(0, -2)); else wrongOptions.push(correctAnswer + 'ed');
    if (correctAnswer.endsWith('ing')) wrongOptions.push(correctAnswer.slice(0, -3)); else wrongOptions.push(correctAnswer + 'ing');
  }

  wrongOptions = [...new Set(wrongOptions)];
  while (wrongOptions.length < 3) {
    const randomType = Object.keys(distractors)[Math.floor(Math.random() * Object.keys(distractors).length)];
    const randomWord = distractors[randomType][Math.floor(Math.random() * distractors[randomType].length)];
    if(randomWord !== correctAnswer && !wrongOptions.includes(randomWord)) {
        wrongOptions.push(randomWord);
    }
  }

  const finalOptions = shuffleArray([correctAnswer, ...wrongOptions.slice(0, 3)]);

  return {
    id: `${sentenceIndex}-${questionIndex}-${Math.random()}`, // ID duy nhất
    originalSentenceIndex: sentenceIndex, // Lưu lại chỉ số câu gốc
    sentence: sentence,
    question: questionText,
    correctAnswer: correctAnswer,
    options: finalOptions,
    explanation: '',
    grammar: '',
    translation: ''
  };
};

const useQuestionGenerator = () => {
  const [fillInTheBlankQuestions, setFillInTheBlankQuestions] = useState([]);
  const [orderingQuestions, setOrderingQuestions] = useState([]);

  const generateQuestions = useCallback((sentences) => {
    // Chỉ tạo một câu hỏi cho mỗi câu ban đầu
    const fillQuestions = sentences.map((sentence, index) => 
      createQuestionFromSentence(sentence, index, 0)
    ).filter(q => q !== null); // Lọc bỏ trường hợp không tạo được câu hỏi

    setFillInTheBlankQuestions(fillQuestions);

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
  }, []);

  // --- EXPORT HÀM MỚI ---
  const regenerateQuestion = useCallback((sentence, sentenceIndex, wordsToExclude) => {
    return createQuestionFromSentence(sentence, sentenceIndex, Date.now(), wordsToExclude);
  }, []);

  return { fillInTheBlankQuestions, setFillInTheBlankQuestions, orderingQuestions, generateQuestions, regenerateQuestion };
};

export default useQuestionGenerator;