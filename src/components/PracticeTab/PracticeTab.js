import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Question from './Question';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';

const createQuestionPrompt = (sentence) => {
  return `Given the sentence: "${sentence}".
Your task is to create a challenging fill-in-the-blank question.
1. Analyze the sentence and choose a single, meaningful word to be the blanked-out answer.
2. Create three incorrect but plausible distractor words of the same grammatical type.
3. Provide a concise grammar explanation in Vietnamese.
4. Provide the full Vietnamese translation of the sentence.
Return the result ONLY as a single, raw JSON object. Do not include any extra text or markdown formatting.
{
  "question_sentence": "...",
  "options": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "grammar_explanation": "...",
  "translation": "..."
}`;
};

const parseAIResponse = (rawText) => {
  try {
    let textToParse = rawText;
    const markdownMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      textToParse = markdownMatch[1];
    }
    const jsonMatch = textToParse.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const obj = JSON.parse(jsonMatch[0]);
      // Kiểm tra đủ trường cần thiết
      if (
        obj.question_sentence &&
        Array.isArray(obj.options) &&
        obj.options.length === 4 &&
        obj.correct_answer &&
        obj.grammar_explanation &&
        obj.translation
      ) {
        return obj;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);

  // Bộ bài chỉ số câu, không lặp lại cho đến khi hết bộ
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [error, setError] = useState(null);

  // Khởi tạo bộ bài ngẫu nhiên khi có dữ liệu
  useEffect(() => {
    if (sentenceData.length > 0) {
      setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
      setCurrentIndex(0);
    }
  }, [sentenceData]);

  // Chọn ngẫu nhiên 1 câu chưa hỏi trong deck
  const pickRandomIndex = (deckArr) => {
    if (!deckArr || deckArr.length === 0) return null;
    const randomIdx = Math.floor(Math.random() * deckArr.length);
    return deckArr[randomIdx];
  };

  // Gửi câu hỏi cho AI mỗi khi currentIndex thay đổi
  useEffect(() => {
    const fetchQuestion = async () => {
      setIsLoading(true);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setError(null);

      if (!deck.length) {
        // Nếu hết bộ bài, xáo lại và bắt đầu vòng mới
        const newDeck = shuffleArray(Array.from(Array(sentenceData.length).keys()));
        setDeck(newDeck);
        setCurrentIndex(0);
        setIsLoading(false);
        return;
      }

      const sentenceIdx = typeof currentIndex === 'number' ? deck[currentIndex] : pickRandomIndex(deck);
      const sentenceObject = sentenceData[sentenceIdx];
      if (!sentenceObject) {
        setError("Không tìm thấy câu hỏi.");
        setIsLoading(false);
        return;
      }

      try {
        const prompt = createQuestionPrompt(sentenceObject.originalText);
        const rawResponse = await callOpenRouterAPI(prompt, selectedModel);
        const questionData = parseAIResponse(rawResponse);

        if (questionData && questionData.options && questionData.correct_answer) {
          const correctAnswerLower = questionData.correct_answer.toLowerCase();
          if (!questionData.options.map(o => o.toLowerCase()).includes(correctAnswerLower)) {
            questionData.options[0] = questionData.correct_answer;
          }
          questionData.options = shuffleArray(questionData.options);
          setCurrentQuestion(questionData);
        } else {
          throw new Error("AI không trả về dữ liệu hợp lệ.");
        }
      } catch (err) {
        setError("AI không phản hồi đúng. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    };

    if (sentenceData.length > 0 && deck.length > 0 && (typeof currentIndex === 'number')) {
      fetchQuestion();
    }
  }, [currentIndex, deck, sentenceData, selectedModel]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    // Loại bỏ câu vừa hỏi khỏi deck
    if (deck.length <= 1) {
      // Nếu hết bộ bài, xáo lại và bắt đầu vòng mới
      setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
      setCurrentIndex(0);
    } else {
      const newDeck = deck.filter((_, idx) => idx !== currentIndex);
      const nextIdx = pickRandomIndex(newDeck);
      setDeck(newDeck);
      setCurrentIndex(newDeck.indexOf(nextIdx));
    }
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
            isCorrect={selectedAnswer && selectedAnswer.toLowerCase() === currentQuestion.correct_answer.toLowerCase()}
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