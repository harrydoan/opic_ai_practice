import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';


// Prompt động cho số từ che 1, 2, 3
const getPracticePrompt = (sentence, numBlanks) => {
  return `Given the sentence: "${sentence}"
1. Randomly hide ${numBlanks} different word${numBlanks > 1 ? 's' : ''} from the sentence using blanks (____). Do not hide the same combination every time.
2. Provide six multiple choice options labeled A–F, in which exactly ${numBlanks} are the correct words to fill in the blanks. The other options must be plausible but incorrect.
3. Choose one of the hidden words and explain its grammar in Vietnamese (including its part of speech, role in the sentence, and position).
4. Translate the full original sentence into Vietnamese.
Only output these four parts and nothing else.
{
  "question_sentence": "The sentence with ${numBlanks === 1 ? 'one' : numBlanks === 2 ? 'two' : 'three'} blank${numBlanks > 1 ? 's' : ''} (____)",
  "options": ["option1", "option2", "option3", "option4", "option5", "option6"],
  "correct_answers": ["the_correct_word${numBlanks > 1 ? 's' : ''}"],
  "grammar_explanation": "...",
  "translation": "..."
}`;
};


const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);

  const [numBlanks, setNumBlanks] = useState(1); // mặc định 1 từ che
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sentenceData.length > 0) {
      setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
      setCurrentIndex(0);
      setNumBlanks(1); // mặc định 1 từ
      setPendingNumBlanks(1);
    }
  }, [sentenceData]);

  const pickRandomIndex = (deckArr) => {
    if (!deckArr || deckArr.length === 0) return null;
    const randomIdx = Math.floor(Math.random() * deckArr.length);
    return deckArr[randomIdx];
  };

  // Sử dụng useCallback để tránh lỗi missing dependency
  const fetchQuestion = React.useCallback(async () => {
    setIsLoading(true);
    setIsAnswered(false);
    setSelectedAnswers([]);
    setError(null);

    if (!deck.length) {
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
      const prompt = getPracticePrompt(sentenceObject.originalText, numBlanks);
      let rawResponse;
      try {
        rawResponse = await callOpenRouterAPI(prompt, selectedModel || 'gpt-3.5-turbo', { max_tokens: 1000 });
      } catch (err) {
        if (err?.message?.toLowerCase().includes('quota') || err?.message?.toLowerCase().includes('limit')) {
          rawResponse = await callOpenRouterAPI(prompt, 'gpt-3.5-turbo', { max_tokens: 1000 });
        } else {
          throw err;
        }
      }
      const questionData = JSON.parse(rawResponse.match(/{[\s\S]*}/)[0]);
      if (questionData && questionData.options && questionData.correct_answers) {
        setCurrentQuestion(questionData);
      } else {
        throw new Error("AI không trả về dữ liệu hợp lệ.");
      }
    } catch (err) {
      setError("AI không phản hồi đúng hoặc đã hết quota. Đang thử lại với mô hình miễn phí.");
    } finally {
      setIsLoading(false);
    }
  }, [deck, currentIndex, sentenceData, selectedModel, numBlanks]);

  useEffect(() => {
    if (sentenceData.length > 0 && deck.length > 0 && (typeof currentIndex === 'number')) {
      fetchQuestion();
    }
  }, [currentIndex, deck, sentenceData, selectedModel, numBlanks, fetchQuestion]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    let newSelected = selectedAnswers.includes(answer)
      ? selectedAnswers.filter(a => a !== answer)
      : [...selectedAnswers, answer];
    setSelectedAnswers(newSelected);
  };

  const handleSubmitAnswers = () => {
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (deck.length <= 1) {
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
        <Button onClick={fetchQuestion}>Thử lại</Button>
      </div>
    );
  }

  if (!currentQuestion) {
    return <p>No questions to display. Please check the 'Input' tab.</p>;
  }

  // UI chọn số từ che
  const blanksSelector = (
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <label style={{ fontWeight: 500 }}>Chọn số từ che:</label>
      {[1,2,3].map(n => (
        <Button
          key={n}
          onClick={() => setNumBlanks(n)}
          className={numBlanks === n ? 'practice-btn selected' : 'practice-btn'}
          style={{ minWidth: 48, borderRadius: 8, fontWeight: 600 }}
        >
          {n}
        </Button>
      ))}
      <span style={{ color: '#888', marginLeft: 8 }}>(Mặc định: 1 từ)</span>
    </div>
  );

  // Hiển thị đáp án, cho phép chọn nhiều đáp án
  return (
    <div className="practice-tab-container">
      {blanksSelector}
      <div className="practice-question" style={{ marginBottom: 16, fontSize: '1.15rem', textAlign: 'center', fontWeight: 500 }}>
        <strong>{currentQuestion.question_sentence}</strong>
      </div>
      <div className="practice-options answers-grid" style={{ marginBottom: 16 }}>
        {currentQuestion.options.map((option, idx) => (
          <button
            key={option}
            className={
              'answer-btn' +
              (isAnswered
                ? currentQuestion.correct_answers.includes(option)
                  ? ' correct'
                  : selectedAnswers.includes(option)
                  ? ' incorrect'
                  : ' disabled'
                : selectedAnswers.includes(option)
                ? ' selected'
                : '')
            }
            onClick={() => handleAnswerSelect(option)}
            disabled={isAnswered}
          >
            {String.fromCharCode(65 + idx)}. {option}
          </button>
        ))}
      </div>
      {!isAnswered && (
        <Button
          onClick={handleSubmitAnswers}
          disabled={selectedAnswers.length !== numBlanks}
          style={{ alignSelf: 'center', minWidth: 160, fontWeight: 600 }}
        >
          Kiểm tra đáp án
        </Button>
      )}
      {isAnswered && (
        <div className="feedback-and-next">
          <Feedback
            isCorrect={
              selectedAnswers.length === currentQuestion.correct_answers.length &&
              selectedAnswers.every(ans => currentQuestion.correct_answers.includes(ans))
            }
            question={{
              explanation: `Đáp án đúng: ${currentQuestion.correct_answers.join(', ')}`,
              grammar: currentQuestion.grammar_explanation,
              translation: currentQuestion.translation,
            }}
            isLoading={false}
          />
          <Button onClick={handleNextQuestion} style={{ alignSelf: 'center', minWidth: 160, fontWeight: 600 }}>
            Next Question →
          </Button>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;