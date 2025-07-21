import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import './MockTestTab.css';

const MOCK_TEST_TIME = 120; // seconds

const MockTestTab = () => {
  // const { sentenceData } = useContext(AppContext); // Removed unused variable
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [timer, setTimer] = useState(MOCK_TEST_TIME);
  const [isFinished, setIsFinished] = useState(false);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const [error, setError] = useState('');

  const startRecording = async () => {
    setError('');
    setIsFinished(false);
    setAudioUrl(null);
    setTimer(MOCK_TEST_TIME);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new window.MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('Không thể truy cập micro. Vui lòng kiểm tra quyền trình duyệt!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsFinished(true);
    clearInterval(timerRef.current);
  };

  return (
    <div className="mocktest-tab-container">
      <h2>Thi thử OPIC</h2>
      <p>Hãy nhấn nút bên dưới để bắt đầu ghi âm bài nói của bạn. Bạn có {MOCK_TEST_TIME/60} phút để hoàn thành.</p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Button onClick={isRecording ? stopRecording : startRecording} style={{ fontSize: 24, padding: '24px 48px', borderRadius: 32, background: isRecording ? '#e53935' : '#43a047', color: '#fff' }}>
          {isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        </Button>
        <div style={{ fontSize: 32, fontWeight: 'bold', color: timer <= 10 ? '#e53935' : '#1976d2' }}>
          {Math.floor(timer/60).toString().padStart(2, '0')}:{(timer%60).toString().padStart(2, '0')}
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {audioUrl && (
          <div style={{ marginTop: 16 }}>
            <audio controls src={audioUrl} />
            <div style={{ marginTop: 8 }}>
              <Button onClick={() => setAudioUrl(null)} variant="secondary">Xóa ghi âm</Button>
            </div>
          </div>
        )}
        {isFinished && <div style={{ color: '#388e3c', marginTop: 8 }}>Đã kết thúc phần thi thử!</div>}
      </div>
    </div>
  );
};

export default MockTestTab;
