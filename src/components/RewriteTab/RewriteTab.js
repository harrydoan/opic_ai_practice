import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getHintWords(sentence, percent = 0.2) {
  const words = sentence.split(/\s+/);
  const n = Math.max(1, Math.floor(words.length * percent));
  const idxs = [];
  while (idxs.length < n) {
    const idx = getRandomInt(words.length);
    if (!idxs.includes(idx)) idxs.push(idx);
  }
  return idxs.map(i => words[i]);
}

const RewriteTab = () => {
  const { sentenceData } = useContext(AppContext);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);
  const [hintWords, setHintWords] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);

  // Chọn ngẫu nhiên 1 câu
  const pickRandomSentence = () => {
    if (!sentenceData || sentenceData.length === 0) return;
    const idx = getRandomInt(sentenceData.length);
    setCurrentIdx(idx);
    setUserInput('');
    setResult(null);
    setShowAnswer(false);
    setHintWords(getHintWords(sentenceData[idx].originalText));
  };

  // So sánh câu người dùng nhập với câu gốc
  const checkAnswer = () => {
    if (currentIdx === null) return;
    const original = sentenceData[currentIdx].originalText.trim();
    const user = userInput.trim();
    const originalWords = original.split(/\s+/);
    const userWords = user.split(/\s+/);
    let correct = true;
    let missing = [];
    let extra = [];
    // Kiểm tra thiếu từ
    for (let w of originalWords) {
      if (!userWords.includes(w)) missing.push(w);
    }
    // Kiểm tra thừa từ
    for (let w of userWords) {
      if (!originalWords.includes(w)) extra.push(w);
    }
    if (missing.length > 0 || extra.length > 0) correct = false;
    setResult({ correct, missing, extra, original });
    setShowAnswer(true);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h2>Luyện tập viết lại câu</h2>
      <Button onClick={pickRandomSentence}>
        Chọn câu ngẫu nhiên
      </Button>
      {currentIdx !== null && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Câu ở vị trí số {currentIdx + 1} có {sentenceData[currentIdx].originalText.split(/\s+/).length} từ.</strong>
            <button
              aria-label="Nghe lại câu hỏi"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              onClick={() => speakText(sentenceData[currentIdx].originalText)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#4facfe"/>
                <path d="M16.5 12c0-1.77-.77-3.29-2-4.29v8.58c1.23-1 2-2.52 2-4.29z" fill="#4facfe"/>
                <path d="M14.5 3.97v2.06c3.39.49 6 3.39 6 6.97s-2.61 6.48-6 6.97v2.06c4.01-.51 7-3.86 7-9.03s-2.99-8.52-7-9.03z" fill="#4facfe"/>
              </svg>
            </button>
          </div>
          <div style={{ marginBottom: 8 }}>
            Gợi ý: Xuất hiện {hintWords.length} từ trong câu: <span style={{ color: '#4facfe', fontWeight: 500 }}>{hintWords.join(', ')}</span>
          </div>
          <textarea
            rows={3}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Viết lại câu ở đây..."
            style={{ width: '100%', marginBottom: 8 }}
          />
          <Button onClick={checkAnswer} disabled={!userInput.trim()}>
            Gửi
          </Button>
        </div>
      )}
      {showAnswer && result && (
        <div style={{ marginTop: 24 }}>
          <h4>Kết quả:</h4>
          {result.correct ? (
            <div style={{ color: '#28a745', fontWeight: 600 }}>✅ Chính xác!</div>
          ) : (
            <div style={{ color: '#dc3545', fontWeight: 600 }}>❌ Chưa đúng!</div>
          )}
          {result.missing.length > 0 && (
            <div style={{ color: '#dc3545' }}>Thiếu từ: {result.missing.join(', ')}</div>
          )}
          {result.extra.length > 0 && (
            <div style={{ color: '#dc3545' }}>Thừa từ: {result.extra.join(', ')}</div>
          )}
          <div style={{ marginTop: 8 }}>
            <strong>Đáp án đúng:</strong> <span style={{ color: '#4facfe' }}>{result.original}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewriteTab;
