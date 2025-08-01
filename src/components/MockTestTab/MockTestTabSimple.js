import React, { useState, useRef } from 'react';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';
import './MockTestTab.css';

function MockTestTabSimple() {
  const [isFinished, setIsFinished] = useState(false);
  const [timer, setTimer] = useState(60);
  const DURATIONS = [60, 90, 120]; // 1 phút, 1.5 phút, 2 phút
  const DURATION_LABELS = ['1 phút', '1.5 phút', '2 phút'];
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]); // mặc định 1 phút
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [questionWait, setQuestionWait] = useState(false);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const [error, setError] = useState('');

  const startRecording = async () => {
    setError('');
    setIsFinished(false);
    setAudioUrl(null);
    setTimer(selectedDuration);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use simple MediaRecorder without special options
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      
      mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        
        console.log('Recording completed:', {
          size: blob.size,
          type: blob.type
        });
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
      setError('Không thể truy cập microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setIsFinished(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRandomQuestion = () => {
    const questions = [
      "Hãy giới thiệu về bản thân bạn",
      "Bạn thích làm gì trong thời gian rảnh?",
      "Mô tả ngôi nhà mơ ước của bạn",
      "Kể về một kỷ niệm đáng nhớ",
      "Bạn nghĩ gì về việc học tiếng Anh?",
      "Mô tả món ăn yêu thích của bạn",
      "Kể về công việc mơ ước",
      "Bạn thích du lịch đến đâu nhất?",
      "Mô tả một ngày lý tưởng của bạn",
      "Kể về sở thích của bạn"
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  };

  const [currentQuestion, setCurrentQuestion] = useState(getRandomQuestion());

  const playQuestion = async () => {
    if (questionWait) return;
    setQuestionWait(true);
    try {
      await speakText(currentQuestion);
      setTimeout(() => {
        setQuestionWait(false);
      }, 2000);
    } catch (err) {
      setError('Không thể phát câu hỏi: ' + err.message);
      setQuestionWait(false);
    }
  };

  return (
    <div className="mock-test-tab">
      <h2>🎯 Thi thử OPIC</h2>
      <p>Chọn thời gian và bắt đầu ghi âm bài nói của bạn</p>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="duration-select" style={{ marginRight: 8, fontWeight: 600 }}>Thời gian:</label>
        <select
          id="duration-select"
          value={selectedDuration}
          onChange={(e) => setSelectedDuration(Number(e.target.value))}
          disabled={isRecording}
          style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          {DURATIONS.map((duration, index) => (
            <option key={duration} value={duration}>
              {DURATION_LABELS[index]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ 
        background: '#f5f5f5', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '16px',
        border: '2px solid #e0e0e0'
      }}>
        <h3 style={{ color: '#1976d2', marginTop: 0 }}>📝 Câu hỏi:</h3>
        <p style={{ fontSize: '18px', fontWeight: '500', margin: '8px 0' }}>
          {currentQuestion}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            onClick={playQuestion}
            disabled={questionWait || isRecording}
            variant="secondary"
            style={{ fontSize: 14 }}
          >
            {questionWait ? 'Đang phát...' : '🔊 Nghe câu hỏi'}
          </Button>
          <Button
            onClick={() => setCurrentQuestion(getRandomQuestion())}
            disabled={isRecording}
            variant="secondary"
            style={{ fontSize: 14 }}
          >
            🔄 Câu hỏi khác
          </Button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', color: timer <= 10 ? 'red' : '#1976d2', marginBottom: 8 }}>
          {formatTime(timer)}
        </div>
        
        {!isRecording && !audioUrl && (
          <Button onClick={startRecording} variant="primary" style={{ fontSize: 20, padding: '12px 24px' }}>
            🎤 Bắt đầu ghi âm
          </Button>
        )}
        
        {isRecording && (
          <Button onClick={stopRecording} variant="secondary" style={{ fontSize: 20, padding: '12px 24px' }}>
            ⏹️ Dừng ghi âm
          </Button>
        )}
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      {audioUrl && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={audioUrl} />
          <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={() => { 
              setAudioUrl(null); 
              if (audioUrl) URL.revokeObjectURL(audioUrl);
            }} variant="secondary">Xóa ghi âm</Button>
            
            <Button
              onClick={() => {
                setAudioUrl(null);
                setIsFinished(false);
                setTimer(selectedDuration);
                setError('');
                if (audioUrl) URL.revokeObjectURL(audioUrl);
              }}
              variant="secondary"
            >Thi lại</Button>

            <a 
              href={audioUrl} 
              download="opic_recording.webm" 
              style={{ textDecoration: 'none' }}
            >
              <Button variant="primary" style={{ fontSize: 18, padding: '10px 24px', borderRadius: 18, marginTop: 8, background: '#388e3c' }}>
                Tải file audio
              </Button>
            </a>
          </div>
        </div>
      )}
      
      {isFinished && <div style={{ color: '#388e3c', marginTop: 8 }}>Đã kết thúc phần thi thử!</div>}
    </div>
  );
}

export default MockTestTabSimple;