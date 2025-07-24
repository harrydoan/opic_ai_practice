import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Feedback from './Feedback';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';
import './PracticeTab.css';



// Prompt lấy từ loại tương tự (đáp án sai) cho 1 từ
const getDistractorPrompt = (word, sentence) =>
  `Tôi cần tạo câu hỏi điền từ tiếng Anh. Hãy trả về 5 từ loại tương tự với từ "${word}" trong câu: "${sentence}" (không trùng với từ đó, không xuất hiện trong câu, không phải tên riêng, không phải từ hiếm, phải là từ phổ biến, cùng từ loại, phù hợp điền vào vị trí đó). Trả về một mảng JSON duy nhất gồm 5 từ, không giải thích gì thêm.`;

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
  const { sentenceData, setActiveTab, selectedModel } = useContext(AppContext);

  const [numBlanks, setNumBlanks] = useState(1); // số từ che hiện tại
  const [pendingNumBlanks, setPendingNumBlanks] = useState(1); // số từ che sẽ dùng cho câu tiếp theo
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [error, setError] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

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

  // Hàm lấy đáp án sai cho từng từ bị che
  const fetchDistractors = useCallback(async (words, sentence) => {
    let distractors = [];
    for (let i = 0; i < words.length; i++) {
      const prompt = getDistractorPrompt(words[i], sentence);
      try {
        const res = await callOpenRouterAPI(prompt, selectedModel, { max_tokens: 200 });
        const arr = JSON.parse(res.match(/\[.*\]/s)[0]);
        distractors = distractors.concat(arr.filter(w => !words.includes(w)));
      } catch (e) {
        // Nếu lỗi, bỏ qua từ này
      }
    }
    // Loại trùng và cắt còn đủ số lượng
    return Array.from(new Set(distractors)).slice(0, 6 - words.length);
  }, [selectedModel]);

  // Hàm tạo câu hỏi luyện tập
  const fetchQuestion = useCallback(async () => {
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

    // 1. Chọn ngẫu nhiên numBlanks từ trong câu
    const picked = pickRandomWords(sentenceObject.originalText, numBlanks);
    if (picked.length < numBlanks) {
      setError('Câu quá ngắn hoặc không đủ từ để che.');
      setIsLoading(false);
      return;
    }
    const blankWords = picked.map(p => p.word);
    const blankIdxs = picked.map(p => p.idx);

    // 2. Tạo câu hỏi với các từ bị che
    const wordsArr = sentenceObject.originalText.split(/\s+/);
    let questionSentence = wordsArr.map((w, i) => blankIdxs.includes(i) ? '____' : w).join(' ');

    // 3. Lấy đáp án sai từ AI
    let distractors = await fetchDistractors(blankWords, sentenceObject.originalText);
    // Nếu không đủ, thêm các từ tiếng Anh phổ biến
    const fallbackDistractors = ['people', 'place', 'thing', 'time', 'day', 'life', 'man', 'woman', 'child', 'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment', 'air', 'teacher', 'force', 'education'];
    while (distractors.length < 6 - blankWords.length) {
      const next = fallbackDistractors.find(w => !blankWords.includes(w) && !distractors.includes(w));
      if (!next) break;
      distractors.push(next);
    }

    // 4. Trộn đáp án đúng và sai
    const options = shuffleArray([...blankWords, ...distractors]).slice(0, 6);

    // 5. Lấy bản dịch tiếng Việt
    let translation = '';
    try {
      const explainPrompt = `Hãy dịch câu sau sang tiếng Việt: "${sentenceObject.originalText}". Trả về một object JSON với trường: translation.`;
      const res = await callOpenRouterAPI(explainPrompt, selectedModel, { max_tokens: 200 });
      const obj = JSON.parse(res.match(/{[\s\S]*}/)[0]);
      translation = obj.translation || '';
    } catch (e) {}

    setCurrentQuestion({
      question_sentence: questionSentence,
      options,
      correct_answers: blankWords,
      grammar_explanation: '',
      translation
    });
    setIsLoading(false);
  }, [deck, currentIndex, sentenceData, numBlanks, fetchDistractors, selectedModel]);

  useEffect(() => {
    if (sentenceData.length > 0 && deck.length > 0 && (typeof currentIndex === 'number')) {
      fetchQuestion();
    }
  }, [currentIndex, deck, sentenceData, numBlanks, fetchQuestion]);

  const handleAnswerSelect = async (answer) => {
    if (isAnswered) return;
    let newSelected = selectedAnswers.includes(answer)
      ? selectedAnswers.filter(a => a !== answer)
      : [...selectedAnswers, answer];
    setSelectedAnswers(newSelected);
    // Nếu đã chọn đủ số đáp án, tự động kiểm tra và lấy bản dịch nếu chưa có
    if (newSelected.length === numBlanks) {
      setFeedbackLoading(true);
      let translation = currentQuestion.translation;
      if (!translation) {
        try {
          const explainPrompt = `Hãy dịch câu sau sang tiếng Việt: "${currentQuestion.question_sentence.replace(/____/g, currentQuestion.correct_answers[0])}". Trả về một object JSON với trường: translation.`;
          const res = await callOpenRouterAPI(explainPrompt, selectedModel, { max_tokens: 200 });
          let obj = {};
          try {
            const match = res && typeof res === 'string' ? res.match(/{[\s\S]*}/) : null;
            if (match && match[0]) {
              obj = JSON.parse(match[0]);
            }
          } catch (err) {
            obj = {};
          }
          translation = typeof obj.translation === 'string' ? obj.translation : '';
        } catch (e) {
          translation = '';
        }
      }
      translation = typeof translation === 'string' ? translation : '';
      setCurrentQuestion(q => ({ ...q, grammar_explanation: '', translation }));
      setTimeout(() => {
        setIsAnswered(true);
        setFeedbackLoading(false);
      }, 200);
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
            isLoading={feedbackLoading}
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