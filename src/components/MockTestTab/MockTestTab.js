import React, { useState, useRef, useContext } from 'react';
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
  const [mp3Url, setMp3Url] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [cloudConvertError, setCloudConvertError] = useState('');

  // Helper: convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const convertToMp3 = async (webmBlob) => {
    setIsConverting(true);
    setCloudConvertError('');
    setMp3Url(null);
    try {
      // Convert blob to base64
      const base64 = await blobToBase64(webmBlob);
      // Call Netlify function
      const res = await fetch('/.netlify/functions/convert-webm-to-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webmBase64: base64 })
      });
      let errorDetails = '';
      let statusCode = res.status;
      let statusText = res.statusText;
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        errorDetails = 'Không thể parse JSON từ phản hồi backend.';
      }
      if (!res.ok || !data || !data.mp3Url) {
        let backendMsg = (data && (data.body || data.error)) ? (data.body || data.error) : '';
        setCloudConvertError(
          `Lỗi convert mp3: Không lấy được link mp3.\n` +
          `Status: ${statusCode} ${statusText}\n` +
          (backendMsg ? `Backend: ${backendMsg}\n` : '') +
          (errorDetails ? `Parse error: ${errorDetails}\n` : '')
        );
        return;
      }
      setMp3Url(data.mp3Url);
    } catch (err) {
      setCloudConvertError('Lỗi convert mp3: ' + err.message);
    }
    setIsConverting(false);
  };

  const [questionPlayed, setQuestionPlayed] = useState(false);
  const [canReplay, setCanReplay] = useState(true);
  const [questionWait, setQuestionWait] = useState(false);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const [error, setError] = useState('');


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
        // Không tự động convert, chỉ lưu blob để user bấm convert
        window._lastWebmBlob = blob; // Lưu tạm để convert khi bấm nút
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
            <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button onClick={() => { setAudioUrl(null); setMp3Url(null); }} variant="secondary">Xóa ghi âm</Button>
              <Button
                onClick={() => {
                  setAudioUrl(null);
                  setMp3Url(null);
                  setIsFinished(false);
                  setTimer(selectedDuration);
                  setQuestionPlayed(false);
                  setCanReplay(true);
                  setError('');
                }}
                variant="secondary"
              >Thi lại</Button>
              {!mp3Url && (
                <Button
                  onClick={async () => {
                    if (!window._lastWebmBlob) {
                      setCloudConvertError('Không tìm thấy file ghi âm để convert!');
                      return;
                    }
                    setCloudConvertError('');
                    setIsConverting(true);
                    try {
                      await convertToMp3(window._lastWebmBlob);
                    } catch (err) {
                      setCloudConvertError('Lỗi convert mp3: ' + (err.message || err));
                    }
                    setIsConverting(false);
                  }}
                  variant="primary"
                  style={{ fontSize: 18, padding: '10px 24px', borderRadius: 18, marginTop: 8, background: '#1976d2' }}
                  disabled={isConverting}
                >{isConverting ? 'Đang chuyển đổi...' : 'Chuyển sang mp3'}</Button>
              )}
              {mp3Url && (
                <a href={mp3Url} download="opic_recording.mp3" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" style={{ fontSize: 18, padding: '10px 24px', borderRadius: 18, marginTop: 8, background: '#388e3c' }}>
                    Tải file mp3
                  </Button>
                </a>
              )}
              {mp3Url && (
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(mp3Url);
                      const blob = await response.blob();
                      const file = new File([blob], 'opic_recording.mp3', { type: 'audio/mp3' });
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          title: 'Chia sẻ bài nói OPIC',
                          text: 'Đây là file ghi âm bài nói OPIC của mình. Nhờ bạn đánh giá giúp nhé!',
                          files: [file]
                        });
                      } else if (navigator.share) {
                        await navigator.share({
                          title: 'Chia sẻ bài nói OPIC',
                          text: 'Đây là file ghi âm bài nói OPIC của mình. Nhờ bạn đánh giá giúp nhé! Link file: ' + mp3Url
                        });
                      } else {
                        await navigator.clipboard.writeText(mp3Url);
                        alert('Đã copy link file mp3. Dán vào Zalo, Messenger, ChatGPT... để chia sẻ!');
                      }
                    } catch (err) {
                      alert('Không thể chia sẻ: ' + err.message);
                    }
                  }}
                  variant="primary"
                  style={{ fontSize: 18, padding: '10px 24px', borderRadius: 18, marginTop: 8, background: '#1976d2' }}
                >Chia sẻ mp3</Button>
              )}
            </div>
            {isConverting && <div style={{ color: '#1976d2', marginTop: 8 }}>Đang chuyển đổi sang mp3...</div>}
            {cloudConvertError && (
              <div style={{ color: 'red', marginTop: 8, whiteSpace: 'pre-wrap', fontWeight: 600 }}>
                <span>Lỗi chuyển đổi mp3:</span>
                <br />
                {cloudConvertError}
              </div>
            )}
          </div>
        )}
        {isFinished && <div style={{ color: '#388e3c', marginTop: 8 }}>Đã kết thúc phần thi thử!</div>}

      </div>
    </div>
  );
}


export default MockTestTab;
