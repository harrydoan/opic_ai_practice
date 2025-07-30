import React, { useState, useRef, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';
import simpleAudioConverter from '../../utils/simpleAudioConverter';
import './MockTestTab.css';

// import { callOpenRouterAPI } from '../../api/openRouterAPI';


// Hàm chuyển voice thành text bằng Google Web Speech API


function MockTestTab() {
  const [isFinished, setIsFinished] = useState(false);
  const [timer, setTimer] = useState(60);
  const DURATIONS = [60, 90, 120]; // 1 phút, 1.5 phút, 2 phút
  const DURATION_LABELS = ['1 phút', '1.5 phút', '2 phút'];
  const { sentenceData } = useContext(AppContext);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]); // mặc định 1 phút
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mp3Url, setMp3Url] = useState(null);
  const [mp3Blob, setMp3Blob] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionMethod, setConversionMethod] = useState('');
  const [cloudConvertError, setCloudConvertError] = useState('');

  const convertToMp3 = async (webmBlob) => {
    setIsConverting(true);
    setCloudConvertError('');
    setMp3Url(null);
    setMp3Blob(null);
    setConversionProgress(0);
    setConversionMethod('');

    try {
      // First, try to optimize the audio
      const optimizedBlob = await audioConverter.optimizeAudio(webmBlob);
      setConversionProgress(5);

      // Convert using the new AudioConverter
      const result = await audioConverter.convertWebmToMp3(
        optimizedBlob,
        (progress) => setConversionProgress(5 + (progress * 0.9)) // 5% for optimization, 90% for conversion
      );

      setConversionMethod(result.method);
      setConversionProgress(100);

      if (result.method === 'client-side') {
        // Client-side conversion returns blob
        setMp3Blob(result.mp3Blob);
        // Create URL for audio element
        const url = URL.createObjectURL(result.mp3Blob);
        setMp3Url(url);
      } else {
        // Server-side conversion returns URL
        setMp3Url(result.mp3Url);
      }

    } catch (err) {
      console.error('Conversion error:', err);
      setCloudConvertError(
        `Lỗi convert mp3: ${err.message}\n\n` +
        `Có thể thử:\n` +
        `- Ghi âm ngắn hơn (dưới 1 phút)\n` +
        `- Kiểm tra kết nối internet\n` +
        `- Refresh trang và thử lại`
      );
    } finally {
      setIsConverting(false);
    }
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
              <Button onClick={() => { 
                setAudioUrl(null); 
                setMp3Url(null); 
                setMp3Blob(null);
                setConversionProgress(0);
                setConversionMethod('');
                setCloudConvertError('');
                // Cleanup URL if it was created client-side
                if (mp3Url && mp3Blob) {
                  URL.revokeObjectURL(mp3Url);
                }
              }} variant="secondary">Xóa ghi âm</Button>
              <Button
                onClick={() => {
                  setAudioUrl(null);
                  setMp3Url(null);
                  setMp3Blob(null);
                  setConversionProgress(0);
                  setConversionMethod('');
                  setCloudConvertError('');
                  setIsFinished(false);
                  setTimer(selectedDuration);
                  setQuestionPlayed(false);
                  setCanReplay(true);
                  setError('');
                  // Cleanup URL if it was created client-side
                  if (mp3Url && mp3Blob) {
                    URL.revokeObjectURL(mp3Url);
                  }
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
                <a 
                  href={mp3Url} 
                  download="opic_recording.mp3" 
                  style={{ textDecoration: 'none' }}
                  onClick={(e) => {
                    // For client-side conversion, create a temporary download URL
                    if (mp3Blob) {
                      e.preventDefault();
                      const url = URL.createObjectURL(mp3Blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'opic_recording.mp3';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                >
                  <Button variant="primary" style={{ fontSize: 18, padding: '10px 24px', borderRadius: 18, marginTop: 8, background: '#388e3c' }}>
                    Tải file mp3
                  </Button>
                </a>
              )}
              {mp3Url && (
                <Button
                  onClick={async () => {
                    try {
                      let file;
                      if (mp3Blob) {
                        // Client-side conversion - use blob directly
                        file = new File([mp3Blob], 'opic_recording.mp3', { type: 'audio/mp3' });
                      } else {
                        // Server-side conversion - fetch from URL
                        const response = await fetch(mp3Url);
                        const blob = await response.blob();
                        file = new File([blob], 'opic_recording.mp3', { type: 'audio/mp3' });
                      }
                      
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
            {isConverting && (
              <div style={{ color: '#1976d2', marginTop: 8 }}>
                <div>Đang chuyển đổi sang mp3... {conversionProgress > 0 && `${Math.round(conversionProgress)}%`}</div>
                {conversionProgress > 0 && (
                  <div style={{ 
                    width: '100%', 
                    height: '6px', 
                    backgroundColor: '#e0e0e0', 
                    borderRadius: '3px', 
                    marginTop: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${conversionProgress}%`, 
                      height: '100%', 
                      backgroundColor: '#1976d2', 
                      transition: 'width 0.3s ease',
                      borderRadius: '3px'
                    }}></div>
                  </div>
                )}
                {conversionMethod && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Phương thức: {conversionMethod === 'client-side' ? 'Xử lý cục bộ' : 'Xử lý trên server'}
                  </div>
                )}
              </div>
            )}
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
