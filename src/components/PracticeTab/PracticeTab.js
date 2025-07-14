import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

// Prompt được nâng cấp để nhận danh sách từ cần loại trừ
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

  // State mới cho logic vòng chơi
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const [pointer, setPointer] = useState(0);

  // Khởi tạo vòng chơi đầu tiên
  useEffect(() => {
    if (sentenceData.length > 0) {
      const initialIndices = Array.from(Array(sentenceData.length).keys());
      setShuffledQueue(shuffleArray(initialIndices));
      setPointer(0);
    }
  }, [sentenceData]);

  const pickAndProcessNextQuestion = useCallback(async () => {
    if (shuffledQueue.length === 0) return;

    setIsLoading(true);
    setIsAnswered(false);
    setSelectedAnswer(null);

    let currentPointer = pointer;
    // Nếu hết vòng, xáo trộn lại và bắt đầu vòng mới
    if (currentPointer >= shuffledQueue.length) {
        currentPointer = 0;
        setShuffledQueue(shuffleArray(shuffledQueue));
    }

    const sentenceIndex = shuffledQueue[currentPointer];
    const sentenceObject = sentenceData.find(s => s.originalIndex === sentenceIndex);

    if (!sentenceObject) {
        setIsLoading(false);
        return;
    }

    try {
      const prompt = createQuestionPrompt(sentenceObject.originalText, sentenceObject.usedWords);
      const result = await callOpenRouterAPI(prompt, selectedModel);
      
      const jsonString = result.match(/{[\s\S]*}/);
      const questionData = JSON.parse(jsonString[0]);

      // Kiểm tra và tự sửa lỗi
      const correctAnswerLower = questionData.correct_answer.toLowerCase();
      if (!questionData.options.map(o => o.toLowerCase()).includes(correctAnswerLower)) {
          questionData.options[0] = questionData.correct_answer;
      }
      questionData.options = shuffleArray(questionData.options);
      
      // Thêm originalIndex vào để biết câu hỏi này thuộc về câu gốc nào
      questionData.originalIndex = sentenceIndex; 
      setCurrentQuestion(questionData);

    } catch (error) {
      console.error("Failed to generate question:", error);
    } finally {
      setIsLoading(false);
      setPointer(currentPointer + 1); // Cập nhật con trỏ cho lần tiếp theo
    }
  }, [pointer, shuffledQueue, sentenceData, selectedModel]);

  // Tải câu hỏi đầu tiên hoặc khi vòng chơi được reset
  useEffect(() => {
    if (shuffledQueue.length > 0) {
      pickAndProcessNextQuestion();
    }
  }, [shuffledQueue]); // Chỉ chạy khi bộ bài được tạo

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };
  
  const handleNextQuestion = () => {
    // Cập nhật "bộ nhớ" của câu vừa trả lời
    const answerToRemember = currentQuestion.correct_answer.toLowerCase();
    setSentenceData(prevData => {
        return prevData.map(s => {
            if (s.originalIndex === currentQuestion.originalIndex) {
                // Thêm từ vừa học vào bộ nhớ, không trùng lặp
                const newUsedWords = [...new Set([...s.usedWords, answerToRemember])];
                // Nếu đã che hết các từ, xóa bộ nhớ để bắt đầu lại
                const allWords = s.originalText.split(' ').filter(w => w.length >= 3);
                if (newUsedWords.length >= allWords.length) {
                    return { ...s, usedWords: [] };
                }
                return { ...s, usedWords: newUsedWords };
            }
            return s;
        });
    });

    // Tải câu hỏi tiếp theo
    pickAndProcessNextQuestion();
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
    return <p>Could not load a question. Please try again.</p>;
  }
  
  return (
    <div className="practice-tab-container">
      {/* Các component con giữ nguyên */}
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