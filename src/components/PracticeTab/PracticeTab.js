import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Feedback from './Feedback';
import Button from '../common/Button';
import './PracticeTab.css';


// Prompt động cho số từ che 1, 2, 3
const getPracticePrompt = (sentence, numBlanks) => {
  // Yêu cầu AI trả về đúng số từ che, hiển thị rõ vị trí các chỗ che bằng ____
  // correct_answers là mảng chứa đúng số từ bị che, options gồm 6 đáp án (số đáp án đúng = numBlanks)
  // Ví dụ: "I ____ to the ____ every ____" với 3 từ che
  return `Given the sentence: "${sentence}"
1. Randomly select and hide exactly ${numBlanks} different words from the sentence. Replace each hidden word with a blank (____) at its original position in the sentence. Do NOT hide the same combination every time. The blanks must be in the correct positions of the original words.
2. Provide exactly 6 answer options (A–F) in a JSON array called "options". Exactly ${numBlanks} of these must be the correct words for the blanks, the rest must be plausible but incorrect.
3. In a JSON array called "correct_answers", list the correct words for the blanks in the order they appear in the sentence.
4. In "question_sentence", return the sentence with the correct number of blanks (____) in the correct positions.
5. In "grammar_explanation", pick ONE of the hidden words and explain its grammar in Vietnamese (bao gồm từ loại, vai trò, vị trí trong câu).
6. In "translation", translate the full original sentence into Vietnamese.
Only output a single JSON object with these 4 fields and nothing else:
{
  "question_sentence": "...", // The sentence with ${numBlanks} blank(s) (____) in the correct positions
  "options": ["option1", "option2", "option3", "option4", "option5", "option6"],
  "correct_answers": ["word1"${numBlanks > 1 ? ', "word2"' : ''}${numBlanks > 2 ? ', "word3"' : ''}],
  "grammar_explanation": "...",
  "translation": "..."
}`;
};


const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const PracticeTab = () => {
  const { sentenceData, selectedModel } = useContext(AppContext);

  const [numBlanks, setNumBlanks] = useState(1); // số từ che hiện tại
  const [pendingNumBlanks, setPendingNumBlanks] = useState(1); // số từ che sẽ dùng cho câu tiếp theo
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
    // Nếu đã chọn đủ số đáp án, tự động kiểm tra
    if (newSelected.length === numBlanks) {
      setTimeout(() => setIsAnswered(true), 200); // delay nhẹ để UX mượt
    }
  };

  const handleNextQuestion = () => {
    // Khi sang câu mới, cập nhật số từ che = pendingNumBlanks
    setNumBlanks(pendingNumBlanks);
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
        <button
          key={n}
          onClick={() => setPendingNumBlanks(n)}
          className={pendingNumBlanks === n ? 'answer-btn selected' : 'answer-btn'}
          style={{ minWidth: 48, borderRadius: 8, fontWeight: 600, outline: 'none', borderWidth: 2 }}
        >
          {n}
        </button>
      ))}
      <span style={{ color: '#888', marginLeft: 8 }}>
        Đang sử dụng: <b>{numBlanks} từ che</b>
      </span>
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
            disabled={isAnswered || (selectedAnswers.length >= numBlanks && !selectedAnswers.includes(option))}
          >
            {String.fromCharCode(65 + idx)}. {option}
          </button>
        ))}
      </div>
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