import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export default RewriteTab;



function RewriteTab() {
  const { sentenceData, setActiveTab } = useContext(AppContext);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Chọn ngẫu nhiên 1 câu
  const pickRandomSentence = () => {
    if (!sentenceData || sentenceData.length === 0) return;
    const idx = getRandomInt(sentenceData.length);
    setCurrentIdx(idx);
    setUserInput('');
    setResult(null);
    setShowAnswer(false);
  };

  // Tự động chọn câu khi vào tab hoặc sau khi bấm Câu tiếp theo
  useEffect(() => {
    if (currentIdx === null && sentenceData && sentenceData.length > 0) {
      pickRandomSentence();
    }
    // eslint-disable-next-line
  }, [sentenceData]);

  // So sánh câu người dùng nhập với câu gốc, chỉ bôi đỏ từ thiếu
  const checkAnswer = () => {
    if (currentIdx === null) return;
    const original = sentenceData[currentIdx].originalText.trim();
    const user = userInput.trim();
    const originalWords = original.split(/\s+/);
    const userWords = user.split(/\s+/);
    let missing = [];
    for (let w of originalWords) {
      if (!userWords.includes(w)) missing.push(w);
    }
    setResult({ missing, original });
    setShowAnswer(true);
  };

  // XÓA UI CŨ, chỉ giữ UI mới đẹp hơn phía dưới
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Luyện tập viết lại câu</h2>
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
          <textarea
            rows={3}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="Viết lại câu ở đây..."
            style={{ width: '100%', fontSize: 20, padding: 16, borderRadius: 10, border: '1.5px solid #90caf9', marginBottom: 12, fontFamily: 'inherit', background: showAnswer ? '#f5f5f5' : '#fff', color: '#222' }}
            disabled={showAnswer}
          />
          {!showAnswer && (
            <Button onClick={checkAnswer} style={{ marginRight: 12, fontSize: 18, padding: '8px 28px' }}>
              Gửi
            </Button>
          )}
          {showAnswer && result && (
            <div style={{ marginTop: 16 }}>
              <div>
                <strong>Đáp án đúng:</strong>
                <span style={{ marginLeft: 8 }}>
                  {sentenceData[currentIdx].originalText.split(/\s+/).map((w, i) =>
                    result.missing.includes(w)
                      ? <span key={i} style={{ color: 'red', fontWeight: 600 }}>{w} </span>
                      : <span key={i}>{w} </span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                <Button onClick={() => { pickRandomSentence(); setShowAnswer(false); }} style={{ fontSize: 18, padding: '8px 28px' }}>
                  Câu tiếp theo
                </Button>
                <Button
                  onClick={() => setActiveTab && setActiveTab('Thi thử')}
                  style={{ fontSize: 18, padding: '8px 28px', marginLeft: 0 }}
                  variant="secondary"
                >
                  Thi thử
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
