import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

const createQuestionPrompt = (sentence, wordsToExclude) => {
  const excludeList = wordsToExclude.length > 0 ? `Do NOT choose any of the following words as the answer: [${wordsToExclude.join(', ')}].` : '';
  return `Given the English sentence: "${sentence}".
Your task is to create a challenging fill-in-the-blank question.
1. Choose a single, meaningful word to be the blanked-out answer. The word must be at least 3 characters long.
2. ${excludeList} If all meaningful words are in the exclusion list, you can ignore this rule for this time only.
3. Create three incorrect but plausible distractor words of the same grammatical type.
4. Provide a concise grammar explanation in Vietnamese.
5. Provide the full Vietnamese translation of the sentence.
Return the result ONLY as a single, raw JSON object with the following structure. Do not include any extra text or markdown formatting.
{
  "question_sentence": "The sentence with '_____' in place of the correct word.",
  "options": ["correct_word", "distractor1", "distractor2", "distractor3"],
  "correct_answer": "the_correct_word_in_lowercase",
  "grammar_explanation": "Your Vietnamese grammar explanation here.",
  "translation": "Your Vietnamese translation here."
}`;
};

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const PracticeTab = () => {
  const { sentenceData, setSentenceData, selectedModel } = useContext(AppContext);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Biến lưu chỉ số câu vừa hỏi
  const [lastQuestionIndex, setLastQuestionIndex] = useState(null);

  const [deck, setDeck] = useState([]);
  const [pointer, setPointer] = useState(0);

  // Lấy câu hỏi mới từ AI
  const fetchQuestion = useCallback(async (currentDeck, currentPointer) => {
    if (!currentDeck || currentDeck.length === 0) return;

    setIsLoading(true);
    setIsAnswered(false);

    const sentenceIndex = currentDeck[currentPointer];
    setLastQuestionIndex(sentenceIndex);

    const sentenceObject = sentenceData.find(s => s.originalIndex === sentenceIndex);

    if (!sentenceObject) {
      console.error("Sentence object not found for index:", sentenceIndex);
      setIsLoading(false);
      return;
    }

    try {
      const prompt = createQuestionPrompt(sentenceObject.originalText, sentenceObject.usedWords);
      const result = await callOpenRouterAPI(prompt, selectedModel);
      const jsonString = result.match(/{[\s\S]*}/);
      let questionData = JSON.parse(jsonString[0]);

      const correctAnswerLower = questionData.correct_answer.toLowerCase();
      if (!questionData.options.map(o => o.toLowerCase()).includes(correctAnswerLower)) {
        questionData.options[0] = questionData.correct_answer;
      }
      questionData.options = shuffleArray(questionData.options);
      questionData.originalIndex = sentenceIndex;

      setCurrentQuestion(questionData);
    } catch (error) {
      console.error("Failed to generate question:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sentenceData, selectedModel]);

  // Khởi tạo deck ngẫu nhiên, loại bỏ câu vừa hỏi nếu có nhiều hơn 1 câu
  useEffect(() => {
    if (sentenceData.length > 0) {
      let initialDeck = shuffleArray(Array.from(Array(sentenceData.length).keys()));
      if (lastQuestionIndex !== null && initialDeck.length > 1) {
        initialDeck = initialDeck.filter(idx => idx !== lastQuestionIndex);
      }
      setDeck(initialDeck);
      setPointer(0);
      fetchQuestion(initialDeck, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentenceData]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };

  // Chuyển sang câu hỏi tiếp theo, đảm bảo không lặp lại câu vừa hỏi
  const handleNextQuestion = () => {
    const answerToRemember = currentQuestion.correct_answer.toLowerCase();
    setSentenceData(prevData => {
      return prevData.map(s => {
        if (s.originalIndex === currentQuestion.originalIndex) {
          const newUsedWords = [...new Set([...s.usedWords, answerToRemember])];
          const allWords = s.originalText.split(' ').filter(w => w.length >= 3);
          if (newUsedWords.length >= allWords.length) {
            return { ...s, usedWords: [] };
          }
          return { ...s, usedWords: newUsedWords };
        }
        return s;
      });
    });

    let nextPointer = pointer + 1;
    let currentDeck = deck;

    // Nếu đã hết deck, tạo deck mới ngẫu nhiên và loại bỏ câu vừa hỏi nếu có nhiều hơn 1 câu
    if (nextPointer >= deck.length) {
      let newDeck = shuffleArray(Array.from(Array(sentenceData.length).keys()));
      if (lastQuestionIndex !== null && newDeck.length > 1) {
        newDeck = newDeck.filter(idx => idx !== lastQuestionIndex);
      }
      currentDeck = newDeck;
      setDeck(currentDeck);
      nextPointer = 0;
    }

    setPointer(nextPointer);
    fetchQuestion(currentDeck, nextPointer);
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