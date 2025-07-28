import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
// ...existing code...
import Feedback from './Feedback';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';
import './PracticeTab.css';



// ...existing code...

// Hàm chọn ngẫu nhiên n từ không trùng nhau trong câu (chỉ chọn từ có độ dài > 2)
function pickRandomWords(sentence, n) {
  const words = sentence.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, ''));
  const validIdx = words
    .map((w, i) => (w.length > 2 ? i : null))
    .filter(i => i !== null);
  if (validIdx.length < n) return [];
  const shuffled = validIdx.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map(i => ({ word: words[i], idx: i }));
}


const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

const PracticeTab = () => {
  const { sentenceData, setActiveTab, sentenceTranslations } = useContext(AppContext);

  const [numBlanks, setNumBlanks] = useState(1); // số từ che hiện tại
  const [pendingNumBlanks, setPendingNumBlanks] = useState(1); // số từ che sẽ dùng cho câu tiếp theo
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [error, setError] = useState(null);
  // ...existing code...

  // Only reset deck and question when sentenceData changes (e.g. after processing input)
  useEffect(() => {
    if (sentenceData.length > 0) {
      setDeck(shuffleArray(Array.from(Array(sentenceData.length).keys())));
      setCurrentIndex(0);
      setNumBlanks(1); // mặc định 1 từ
      setPendingNumBlanks(1);
      setIsLoading(false);
      // Generate the first question
      generateQuestion(0, 1, shuffleArray(Array.from(Array(sentenceData.length).keys())));
    }
    // eslint-disable-next-line
  }, [sentenceData]);

  const pickRandomIndex = (deckArr) => {
    if (!deckArr || deckArr.length === 0) return null;
    const randomIdx = Math.floor(Math.random() * deckArr.length);
    return deckArr[randomIdx];
  };

  // Improved distractor logic: use words from all saved practice files for more challenging distractors
  const fetchDistractors = React.useCallback((blankWords, currentSentence, sentenceData) => {
    const distractorTypes = {
      article: ['a', 'an', 'the'],
      preposition: ['in', 'on', 'at', 'with', 'from', 'for', 'about', 'over', 'under', 'by'],
      verb: ['is', 'are', 'was', 'were', 'be', 'being', 'been'],
    };
    const getWordType = (word) => {
      for (const type in distractorTypes) {
        if (distractorTypes[type].includes(word.toLowerCase())) return type;
      }
      if (/^(to|of|and|but|or|if|because|as|than|so|though)$/i.test(word)) return 'preposition';
      return null;
    };
    // Get all words from other sentences (not current)
    const currentWordsSet = new Set(currentSentence.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, '')));
    let otherWords = [];
    sentenceData.forEach(s => {
      if (s.originalText !== currentSentence) {
        otherWords = otherWords.concat(s.originalText.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, '')));
      }
    });
    // Add words from all saved practice files
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('opic_practice_') && !key.endsWith('_time')) {
        try {
          const saved = JSON.parse(localStorage.getItem(key));
          if (saved && saved.opicText) {
            saved.opicText.split(/[.!?]+/).forEach(s => {
              otherWords = otherWords.concat(s.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, '')));
            });
          }
        } catch {}
      }
    });
    // Remove words that are in current sentence
    otherWords = otherWords.filter(w => w.length > 2 && !currentWordsSet.has(w));
    // For each blank, pick words of same type from other sentences and saved files
    let distractors = [];
    for (let i = 0; i < blankWords.length; i++) {
      const type = getWordType(blankWords[i]);
      const candidates = otherWords.filter(w => getWordType(w) === type && !blankWords.includes(w));
      distractors = distractors.concat(candidates);
    }
    // Nếu không đủ distractors, thêm các từ phổ biến cùng loại
    while (distractors.length < 6 - blankWords.length) {
      for (const type in distractorTypes) {
        for (const w of distractorTypes[type]) {
          if (!blankWords.includes(w) && !distractors.includes(w) && !currentWordsSet.has(w)) distractors.push(w);
          if (distractors.length >= 6 - blankWords.length) break;
        }
        if (distractors.length >= 6 - blankWords.length) break;
      }
    }
    // Loại bỏ trùng lặp, trộn thứ tự distractor để đa dạng hơn
    return shuffleArray(Array.from(new Set(distractors))).slice(0, 6 - blankWords.length);
  }, []);

  // Hàm tạo câu hỏi luyện tập

  // Generate a question for a given index, blanks, and deck
  const generateQuestion = (index, blanks, deckArr) => {
    setIsAnswered(false);
    setSelectedAnswers([]);
    setError(null);
    if (!deckArr.length) return;
    const sentenceIdx = typeof index === 'number' ? deckArr[index] : pickRandomIndex(deckArr);
    const sentenceObject = sentenceData[sentenceIdx];
    if (!sentenceObject) {
      setError("Không tìm thấy câu hỏi.");
      return;
    }
    const picked = pickRandomWords(sentenceObject.originalText, blanks);
    // Ensure number of unique blank words matches blanks
    const blankWords = picked.map(p => p.word);
    const uniqueBlankWords = Array.from(new Set(blankWords));
    if (uniqueBlankWords.length < blanks) {
      setError('Câu này không đủ từ khác nhau để che. Vui lòng chọn số từ che nhỏ hơn hoặc đổi câu khác.');
      return;
    }
    const blankIdxs = picked.map(p => p.idx);
    const wordsArr = sentenceObject.originalText.split(/\s+/);
    let questionSentence = wordsArr.map((w, i) => blankIdxs.includes(i) ? '____' : w).join(' ');
    // Get distractors, ensure no overlap with correct answers
    let distractors = fetchDistractors(uniqueBlankWords, sentenceObject.originalText, sentenceData).filter(d => !uniqueBlankWords.includes(d));
    // Remove duplicates from distractors
    distractors = Array.from(new Set(distractors));
    // Fill up to 6 options
    let options = [...uniqueBlankWords];
    for (let i = 0; options.length < 6 && i < distractors.length; i++) {
      if (!options.includes(distractors[i])) {
        options.push(distractors[i]);
      }
    }
    // If still less than 6, fill with generic distractors (from distractorTypes)
    if (options.length < 6) {
      const distractorTypes = {
        article: ['a', 'an', 'the'],
        preposition: ['in', 'on', 'at', 'with', 'from', 'for', 'about', 'over', 'under', 'by'],
        verb: ['is', 'are', 'was', 'were', 'be', 'being', 'been'],
      };
      for (const type in distractorTypes) {
        for (const w of distractorTypes[type]) {
          if (!options.includes(w)) {
            options.push(w);
            if (options.length === 6) break;
          }
        }
        if (options.length === 6) break;
      }
    }
    options = shuffleArray(options);
    let translation = '';
    if (sentenceTranslations && sentenceTranslations.length > sentenceIdx) {
      if (typeof sentenceTranslations[sentenceIdx] === 'object' && sentenceTranslations[sentenceIdx] !== null) {
        translation = sentenceTranslations[sentenceIdx].translation || '';
      } else {
        translation = sentenceTranslations[sentenceIdx] || '';
      }
    }
    setCurrentQuestion({
      question_sentence: questionSentence,
      options,
      correct_answers: uniqueBlankWords,
      grammar_explanation: '',
      translation
    });
  };


  // Only generate a new question when user clicks next or when data is loaded
  useEffect(() => {
    if (sentenceData.length > 0 && deck.length > 0 && typeof currentIndex === 'number') {
      generateQuestion(currentIndex, numBlanks, deck);
    }
    // eslint-disable-next-line
  }, [currentIndex, deck, numBlanks]);

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;
    let newSelected = selectedAnswers.includes(answer)
      ? selectedAnswers.filter(a => a !== answer)
      : [...selectedAnswers, answer];
    setSelectedAnswers(newSelected);
    // Nếu đã chọn đủ số đáp án, tự động kiểm tra
    if (newSelected.length === numBlanks) {
      setIsAnswered(true);
    }
  };

  const handleNextQuestion = () => {
    // Khi sang câu mới, cập nhật số từ che = pendingNumBlanks
    setNumBlanks(pendingNumBlanks);
    if (deck.length <= 1) {
      const newDeck = shuffleArray(Array.from(Array(sentenceData.length).keys()));
      setDeck(newDeck);
      setCurrentIndex(0);
    } else {
      const newDeck = deck.filter((_, idx) => idx !== currentIndex);
      setDeck(newDeck);
      setCurrentIndex(0); // always go to the first in the new deck
    }
  };

  if (isLoading) {
    // Không hiển thị spinner/loading nữa, chỉ hiển thị trống hoặc chuyển sang câu hỏi luôn
    return null;
  }

  if (error) {
    return (
      <div className="processing-container">
        <p>An error occurred:</p>
        <p><i>{error}</i></p>
        <Button onClick={() => generateQuestion(currentIndex, numBlanks, deck)}>Thử lại</Button>
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
          style={{ minWidth: 48, borderRadius: 8, fontWeight: 600, outline: 'none', borderWidth: 2, marginRight: 4 }}
        >
          {n}
        </button>
      ))}
      <span style={{ color: '#4facfe', marginLeft: 16, fontWeight: 500 }}>
        Đang sử dụng: <b>{numBlanks} từ che</b>
      </span>
    </div>
  );

  // Hiển thị đáp án, chọn đủ là kiểm tra luôn
  return (
    <div className="practice-tab-container">
      {blanksSelector}
      <div className="practice-question" style={{ marginBottom: 16, fontSize: '1.15rem', textAlign: 'center', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <strong>{currentQuestion.question_sentence}</strong>
        <button
          aria-label="Nghe câu hoàn chỉnh"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          onClick={() => {
            // Lấy đúng index hiện tại trong deck để lấy câu gốc
            let fullSentence = '';
            if (sentenceData && deck && typeof currentIndex === 'number' && deck.length > 0) {
              const idx = deck[currentIndex];
              if (typeof idx === 'number' && sentenceData[idx]) {
                fullSentence = sentenceData[idx].originalText;
              }
            }
            speakText(fullSentence);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#4facfe"/>
            <path d="M16.5 12c0-1.77-.77-3.29-2-4.29v8.58c1.23-1 2-2.52 2-4.29z" fill="#4facfe"/>
            <path d="M14.5 3.97v2.06c3.39.49 6 3.39 6 6.97s-2.61 6.48-6 6.97v2.06c4.01-.51 7-3.86 7-9.03s-2.99-8.52-7-9.03z" fill="#4facfe"/>
          </svg>
        </button>
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
            // isLoading prop removed; feedbackLoading is unused and undefined
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button onClick={handleNextQuestion} style={{ minWidth: 160, fontWeight: 600 }}>
              Next Question →
            </Button>
            <Button onClick={() => setActiveTab('Sắp xếp câu')} style={{ minWidth: 180, fontWeight: 600 }} variant="secondary">
              Luyện tập sắp xếp câu
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeTab;