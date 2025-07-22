
import React, { useState, useRef, useContext } from 'react';
import { googleSpeechToText } from '../../api/googleSpeechToText';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';
import './MockTestTab.css';

// import { callOpenRouterAPI } from '../../api/openRouterAPI';


// Hàm chuyển voice thành text bằng Google Web Speech API


function MockTestTab() {
  const DURATIONS = [60, 90, 120]; // 1 phút, 1.5 phút, 2 phút
  const DURATION_LABELS = ['1 phút', '1.5 phút', '2 phút'];
  const { sentenceData } = useContext(AppContext);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]); // mặc định 1 phút
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [timer, setTimer] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  const [questionPlayed, setQuestionPlayed] = useState(false);
  const [canReplay, setCanReplay] = useState(true);
  const [questionWait, setQuestionWait] = useState(false);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');

  // Lấy câu hỏi đầu tiên
  const question = sentenceData && sentenceData.length > 0 ? sentenceData[0].originalText : '';

  // Phát câu hỏi, sau 5s cho phép ghi âm
  const playQuestion = () => {
    if (!question) return;
    setQuestionWait(true);
    speakText(question);
    setTimeout(() => {
      setQuestionWait(false);
      setQuestionPlayed(true);
      setCanReplay(false);
      startRecording();
    }, 5000);
  };

  // Cho phép nghe lại 1 lần
  const replayQuestion = () => {
    if (!question || !canReplay) return;
    setCanReplay(false);
    speakText(question);
    setTimeout(() => {
      setQuestionWait(false);
      setQuestionPlayed(true);
      startRecording();
    }, 5000);
  };

  const startRecording = async () => {
    setError('');
    setIsFinished(false);
    setAudioUrl(null);
    setTimer(selectedDuration);
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
      <h2 style={{ color: '#1976d2', marginBottom: 8 }}>Thi thử OPIC</h2>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong>Chọn thời gian nói:</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          {DURATIONS.map((sec, idx) => (
            <Button
              key={sec}
              onClick={() => setSelectedDuration(sec)}
              variant={selectedDuration === sec ? 'primary' : 'secondary'}
              style={{
                minWidth: 80,
                fontWeight: selectedDuration === sec ? 700 : 400,
                background: selectedDuration === sec ? '#1976d2' : '#e3f2fd',
                color: selectedDuration === sec ? '#fff' : '#1976d2',
                border: selectedDuration === sec ? '2px solid #1976d2' : '1px solid #90caf9',
                fontSize: 18,
                padding: '6px 20px',
                borderRadius: 18
              }}
              disabled={isRecording}
            >
              {DURATION_LABELS[idx]}
            </Button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 18 }}>
        <strong>Câu hỏi:</strong> {question ? question : <span style={{ color: 'gray' }}>(Chưa có dữ liệu)</span>}
        <Button onClick={playQuestion} disabled={isRecording || questionWait || !question} style={{ marginLeft: 16, fontSize: 16 }}>
          Nghe câu hỏi
        </Button>
        {questionPlayed && canReplay && (
          <Button onClick={replayQuestion} disabled={isRecording || questionWait} style={{ marginLeft: 8, fontSize: 16 }} variant="secondary">
            Nghe lại
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Button
          onClick={isRecording ? stopRecording : playQuestion}
          style={{ fontSize: 24, padding: '24px 48px', borderRadius: 32, background: isRecording ? '#e53935' : '#43a047', color: '#fff' }}
          disabled={questionWait || (!isRecording && !question)}
        >
          {isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        </Button>
      <div style={{ width: 320, margin: '12px 0' }}>
        <div style={{ height: 12, background: '#e3e3e3', borderRadius: 8, overflow: 'hidden' }}>
          {(() => {
            let percent = 1;
            let barColor = '#1976d2';
            if (isRecording) {
              percent = timer / selectedDuration;
              if (percent <= 0.33) barColor = '#e53935';
              else if (percent <= 0.66) barColor = '#ffc107';
            }
            return (
              <div
                style={{
                  width: `${percent * 100}%`,
                  height: '100%',
                  background: barColor,
                  transition: 'width 1s linear, background 0.5s',
                }}
              />
            );
          })()}
        </div>
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: isRecording ? (timer <= 10 ? '#e53935' : timer/selectedDuration <= 0.66 ? '#ffc107' : '#1976d2') : '#1976d2', marginTop: 2 }}>
          {isRecording
            ? `${Math.floor(timer/60).toString().padStart(2, '0')}:${(timer%60).toString().padStart(2, '0')}`
            : `Thời lượng đã chọn: ${DURATION_LABELS[DURATIONS.indexOf(selectedDuration)]}`}
        </div>
      </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {audioUrl && (
          <div style={{ marginTop: 16 }}>
            <audio controls src={audioUrl} />
            <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button onClick={() => setAudioUrl(null)} variant="secondary">Xóa ghi âm</Button>
              <Button
                onClick={() => {
                  // Reset lại trạng thái để thi lại
                  setAudioUrl(null);
                  setIsFinished(false);
                  setTimer(selectedDuration);
                  setQuestionPlayed(false);
                  setCanReplay(true);
                  setError('');
                }}
                variant="secondary"
              >Thi lại</Button>
              <Button
                onClick={async () => {
                  setTranscript('');
                  if (!audioUrl) {
                    setTranscript('Không có file ghi âm.');
                    return;
                  }
                  try {
                    // Lấy blob từ audioUrl
                    const response = await fetch(audioUrl);
                    let audioBlob = await response.blob();
                    // Kiểm tra định dạng, chuyển sang FLAC nếu cần
                    if (audioBlob.type !== 'audio/flac') {
                      setTranscript('Đang chuyển đổi sang định dạng FLAC...');
                      // Sử dụng Web Audio API để chuyển đổi sang FLAC (nếu có thư viện, ví dụ flac.js)
                      // Nếu không có, cảnh báo người dùng
                      setTranscript('File ghi âm không phải FLAC. Vui lòng ghi âm bằng định dạng FLAC để nhận diện tốt nhất.');
                      // return;
                    }
                    // Kiểm tra kích thước file
                    if (audioBlob.size > 10 * 1024 * 1024) {
                      setTranscript('File ghi âm quá lớn (>10MB), không thể gửi lên Google Cloud.');
                      return;
                    }
                    setTranscript('Đang gửi lên Google Cloud...');
                    try {
                      const text = await googleSpeechToText(audioBlob);
                      setTranscript(text || 'Không nhận diện được nội dung.');
                    } catch (apiErr) {
                      setTranscript('Lỗi API: ' + (apiErr.message || apiErr.code || 'Unknown error'));
                    }
                  } catch (err) {
                    setTranscript('Lỗi chuyển đổi: ' + err.message);
                  }
                }}
                variant="primary"
                style={{ fontSize: 18, padding: '10px 24px', borderRadius: 18, marginTop: 8 }}
              >Chuyển file ghi âm thành text (Google Cloud)</Button>
            </div>
          </div>
        )}
        {isFinished && <div style={{ color: '#388e3c', marginTop: 8 }}>Đã kết thúc phần thi thử!</div>}
        {transcript && (
          <div style={{
            marginTop: 18,
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 16,
            maxWidth: 400,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)'
          }}>
            <div style={{ fontWeight: 700, color: '#1976d2', marginBottom: 6 }}>Kết quả chuyển voice thành text:</div>
            <div style={{ background: '#fff', borderRadius: 6, padding: 8, marginTop: 4, fontStyle: 'italic', color: '#333', border: '1px solid #90caf9' }}>
              {transcript}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MockTestTab;

// Giải thích level OPIC

// Giải thích level OPIC
