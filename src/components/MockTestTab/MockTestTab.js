
import React, { useState, useRef, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../common/Button';
import { speakText } from '../../utils/speech';
import './MockTestTab.css';

import { callOpenRouterAPI } from '../../api/openRouterAPI';

// Hàm gửi bản ghi âm và câu hỏi lên AI thực tế để chấm điểm
async function sendAudioToAI(audioBlob, questionText) {
  // Chuyển audioBlob sang base64
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const audioBase64 = await toBase64(audioBlob);
  // Prompt yêu cầu AI chấm điểm phát âm, nhận xét, đánh giá level
  const prompt = `Bạn là giám khảo OPIC. Hãy đánh giá phát âm, nhận xét điểm mạnh/yếu, và chấm điểm level cho bài nói sau.\nCâu hỏi: ${questionText}\nBản ghi âm (base64, webm): ${audioBase64}\nTrả về JSON với các trường: pronunciation, feedback, level, score.`;
  const result = await callOpenRouterAPI(prompt, undefined, { max_tokens: 400 });
  // Nếu trả về JSON dạng text, parse ra object
  try {
    if (typeof result === 'string') {
      return JSON.parse(result);
    }
    return result;
  } catch {
    return { pronunciation: '', feedback: 'Lỗi phân tích kết quả AI', level: '', score: '' };
  }
}

// Giải thích level OPIC
function getOpicLevelDesc(level) {
  if (!level) return '';
  const descs = {
    'Novice Low': '– Có thể nói các câu rất đơn giản, vốn từ hạn chế.',
    'Novice Mid': '– Có thể trả lời các câu hỏi cơ bản, phát âm còn nhiều lỗi.',
    'Novice High': '– Có thể giao tiếp cơ bản, còn hạn chế về ngữ pháp.',
    'Intermediate Low': '– Có thể trình bày ý đơn giản, còn thiếu tự nhiên.',
    'Intermediate Mid': '– Giao tiếp tốt các chủ đề quen thuộc, còn mắc lỗi nhỏ.',
    'Intermediate High': '– Giao tiếp đa dạng, diễn đạt khá tự nhiên.',
    'Advanced Low': '– Giao tiếp tốt, diễn đạt ý phức tạp, phát âm tốt.',
    'Advanced Mid': '– Giao tiếp lưu loát, tự nhiên, kiểm soát tốt ngôn ngữ.',
    'Advanced High': '– Gần như người bản xứ, rất ít lỗi.',
    'Superior': '– Giao tiếp như người bản xứ, diễn đạt xuất sắc.',
    'Intermediate': '– Trình độ trung bình, có thể giao tiếp các chủ đề quen thuộc.',
    'Advanced': '– Trình độ cao, giao tiếp tốt nhiều chủ đề.',
  };
  return descs[level] ? `(${descs[level]})` : '';

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
          {DURATIONS.map(sec => (
            <Button
              key={sec}
              onClick={() => setSelectedDuration(sec)}
              variant={selectedDuration === sec ? undefined : 'secondary'}
              style={{
                minWidth: 60,
                fontWeight: selectedDuration === sec ? 700 : 400,
                background: selectedDuration === sec ? '#1976d2' : '#e3e3e3',
                color: selectedDuration === sec ? '#fff' : '#333',
                border: selectedDuration === sec ? '2px solid #1976d2' : '1px solid #bbb',
                fontSize: 18,
                padding: '6px 20px',
                borderRadius: 18
              }}
              disabled={isRecording}
            >
              {sec/60} phút
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
              const percent = timer / selectedDuration;
              let barColor = '#1976d2'; // xanh
              if (percent <= 0.33) barColor = '#e53935'; // đỏ
              else if (percent <= 0.66) barColor = '#ffc107'; // vàng
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
          <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: timer <= 10 ? '#e53935' : timer/selectedDuration <= 0.66 ? '#ffc107' : '#1976d2', marginTop: 2 }}>
            {Math.floor(timer/60).toString().padStart(2, '0')}:{(timer%60).toString().padStart(2, '0')}
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
                  if (!audioUrl) {
                    alert('Bạn cần ghi âm trước khi gửi chấm điểm!');
                    return;
                  }
                  setIsSending(true);
                  setAiResult(null);
                  // Lấy blob từ audioUrl
                  try {
                    const response = await fetch(audioUrl);
                    const audioBlob = await response.blob();
                    const result = await sendAudioToAI(audioBlob, question);
                    setAiResult(result);
                  } catch (e) {
                    setError('Gửi dữ liệu thất bại!');
                  }
                  setIsSending(false);
                }}
                variant="primary"
                disabled={isSending}
              >{isSending ? 'Đang gửi...' : 'Gửi chấm điểm'}</Button>
            </div>
          </div>
        )}
        {isFinished && <div style={{ color: '#388e3c', marginTop: 8 }}>Đã kết thúc phần thi thử!</div>}
        {aiResult && (
          <div style={{
            marginTop: 18,
            background: '#f5f5f5',
            borderRadius: 12,
            padding: 16,
            maxWidth: 400,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)'
          }}>
            <div style={{ fontWeight: 700, color: '#1976d2', marginBottom: 6 }}>Kết quả AI đánh giá:</div>
            <div><b>Phát âm:</b> {aiResult.pronunciation}</div>
            <div><b>Nhận xét:</b> {aiResult.feedback}</div>
            <div><b>Level:</b> {aiResult.level} <span style={{ color: '#888', fontSize: 13 }}>{getOpicLevelDesc(aiResult.level)}</span></div>
            <div><b>Điểm:</b> {aiResult.score}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Giải thích level OPIC
function getOpicLevelDesc(level) {
  if (!level) return '';
  const descs = {
    'Novice Low': '– Có thể nói các câu rất đơn giản, vốn từ hạn chế.',
    'Novice Mid': '– Có thể trả lời các câu hỏi cơ bản, phát âm còn nhiều lỗi.',
    'Novice High': '– Có thể giao tiếp cơ bản, còn hạn chế về ngữ pháp.',
    'Intermediate Low': '– Có thể trình bày ý đơn giản, còn thiếu tự nhiên.',
    'Intermediate Mid': '– Giao tiếp tốt các chủ đề quen thuộc, còn mắc lỗi nhỏ.',
    'Intermediate High': '– Giao tiếp đa dạng, diễn đạt khá tự nhiên.',
    'Advanced Low': '– Giao tiếp tốt, diễn đạt ý phức tạp, phát âm tốt.',
    'Advanced Mid': '– Giao tiếp lưu loát, tự nhiên, kiểm soát tốt ngôn ngữ.',
    'Advanced High': '– Gần như người bản xứ, rất ít lỗi.',
    'Superior': '– Giao tiếp như người bản xứ, diễn đạt xuất sắc.',
    'Intermediate': '– Trình độ trung bình, có thể giao tiếp các chủ đề quen thuộc.',
    'Advanced': '– Trình độ cao, giao tiếp tốt nhiều chủ đề.',
  };
  return descs[level] ? `(${descs[level]})` : '';
}

// Giải thích level OPIC
function getOpicLevelDesc(level) {
  if (!level) return '';
  const descs = {
    'Novice Low': '– Có thể nói các câu rất đơn giản, vốn từ hạn chế.',
    'Novice Mid': '– Có thể trả lời các câu hỏi cơ bản, phát âm còn nhiều lỗi.',
    'Novice High': '– Có thể giao tiếp cơ bản, còn hạn chế về ngữ pháp.',
    'Intermediate Low': '– Có thể trình bày ý đơn giản, còn thiếu tự nhiên.',
    'Intermediate Mid': '– Giao tiếp tốt các chủ đề quen thuộc, còn mắc lỗi nhỏ.',
    'Intermediate High': '– Giao tiếp đa dạng, diễn đạt khá tự nhiên.',
    'Advanced Low': '– Giao tiếp tốt, diễn đạt ý phức tạp, phát âm tốt.',
    'Advanced Mid': '– Giao tiếp lưu loát, tự nhiên, kiểm soát tốt ngôn ngữ.',
    'Advanced High': '– Gần như người bản xứ, rất ít lỗi.',
    'Superior': '– Giao tiếp như người bản xứ, diễn đạt xuất sắc.',
    'Intermediate': '– Trình độ trung bình, có thể giao tiếp các chủ đề quen thuộc.',
    'Advanced': '– Trình độ cao, giao tiếp tốt nhiều chủ đề.',
  };
  return descs[level] ? `(${descs[level]})` : '';
}
