import React, { useState, useContext } from 'react';
import { speakText } from '../../utils/speech';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

const cleanOpicResponse = (rawText) => {
  if (!rawText) return '';
  const prefixesToRemove = [
    'Question:', 'Sample Answer:', 'Answer:',
    'Câu hỏi:', 'Câu trả lời mẫu:', 'Câu trả lời:'
  ];
  const cleanedLines = rawText.split('\n').map(line => {
    let cleanedLine = line.trim();
    for (const prefix of prefixesToRemove) {
      if (cleanedLine.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleanedLine = cleanedLine.substring(prefix.length).trim();
        break;
      }
    }
    return cleanedLine;
  });
  return cleanedLines.join('\n').trim();
};

const InputTab = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('AL');
  const { setSentenceData, setActiveTab, opicText, setOpicText } = useContext(AppContext);

  // Lưu và tải lại dữ liệu luyện tập từ localStorage với tên file
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedFiles, setSavedFiles] = useState([]);

  // Luôn refresh danh sách khi render
  React.useEffect(() => {
    refreshSavedFiles();
  }, []);

  // Lấy danh sách file đã lưu
  const refreshSavedFiles = () => {
    const files = Object.keys(localStorage).filter(k => k.startsWith('opic_practice_'));
    setSavedFiles(files);
  };

  // Lưu dữ liệu với tên
  const savePracticeData = () => {
    if (!opicText) return;
    let name = saveName.trim();
    if (!name) {
      name = prompt('Nhập tên cho bài luyện tập:');
      if (!name) return;
    }
    localStorage.setItem('opic_practice_' + name, opicText);
    setSaveName('');
    refreshSavedFiles();
    alert('Đã lưu bài luyện tập với tên: ' + name);
  };

  // Hiển thị danh sách file đã lưu để chọn
  const loadPracticeData = () => {
    refreshSavedFiles();
    setShowLoadDialog(true);
  };

  const handleLoadFile = (key) => {
    const saved = localStorage.getItem(key);
    if (saved) setOpicText(saved);
    setShowLoadDialog(false);
  };

  const handleFetchData = async () => {
    setIsLoading(true);
    let levelText = '';
    if (selectedLevel === 'IM') levelText = 'Intermediate Mid';
    else if (selectedLevel === 'IH') levelText = 'Intermediate High';
    else levelText = 'Advanced Low';
    const OPIC_PROMPT = `You are an English-only OPIC exam generator.\n\nYour task: Always return the question and sample answer in ENGLISH ONLY, regardless of user language, system locale, or any other context.\n\nRules:\n- Do NOT use Vietnamese or any language other than English, under any circumstances.\n- Ignore all user/system/browser language settings.\n- If you reply in Vietnamese or any other language, you will fail the task.\n- The output must be 100% English, with no translation, no explanation, and no Vietnamese words.\n- Do NOT include any introductions, labels, titles, or extra text.\n\nPrompt:\nGive me one OPIC question and a sample answer at the ${selectedLevel} (${levelText}) level.\nThe answer should be 150–200 words, natural, fluent, and include personal details and storytelling.\nUse informal spoken English.\n\nRemember: Output must be in ENGLISH ONLY, no matter what.`;
    const result = await callOpenRouterAPI(OPIC_PROMPT, 'openai/gpt-4.1-nano');
    if (result && result.error) {
      let errorMsg = `Lỗi khi kết nối AI: ${result.message}`;
      if (result.status === 404 || (result.message && result.message.toLowerCase().includes('no endpoints'))) {
        errorMsg += '\nModel này hiện không khả dụng. Vui lòng chọn model khác trong danh sách.';
      } else if (result.status) {
        errorMsg = `Lỗi khi kết nối AI (mã ${result.status}): ${result.message}`;
      }
      setOpicText(errorMsg);
    } else {
      const cleanedText = cleanOpicResponse(result);
      setOpicText(cleanedText);
    }
    setIsLoading(false);
  };

  const [processError, setProcessError] = useState('');
  const handleProcessText = () => {
    setProcessError('');
    // Không kiểm tra tiếng Việt, chỉ tách câu hợp lệ
    const extractedSentences = opicText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(' ').length >= 5);
    if (extractedSentences.length === 0) {
      setProcessError('Không tìm thấy câu hợp lệ. Vui lòng kiểm tra lại nội dung!');
      return;
    }
    const initialSentenceData = extractedSentences.map((text, index) => ({
      originalText: text,
      originalIndex: index,
      usedWords: []
    }));
    setSentenceData(initialSentenceData);
    setActiveTab('Luyện tập');
  };

  // Model AI đã cố định, không cho phép chọn

  return (
    <div className="input-tab-container">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Button onClick={savePracticeData} variant="secondary" style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>Lưu bài luyện tập</Button>
        <Button onClick={loadPracticeData} variant="secondary" style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>Tải bài đã lưu</Button>
      </div>

      {showLoadDialog && (
        <div style={{ background: '#fff', border: '1.5px solid #90caf9', borderRadius: 10, padding: 16, position: 'absolute', zIndex: 10, top: 80, left: '50%', transform: 'translateX(-50%)', minWidth: 320 }}>
          <h4>Chọn bài luyện tập đã lưu</h4>
          {savedFiles.length === 0 ? (
            <div style={{ color: 'gray' }}>Không có bài luyện tập nào.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {savedFiles.map(key => (
                <li key={key} style={{ marginBottom: 8 }}>
                  <Button onClick={() => handleLoadFile(key)} style={{ minWidth: 180 }}>{key.replace('opic_practice_', '')}</Button>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => setShowLoadDialog(false)} variant="secondary" style={{ marginTop: 8 }}>Đóng</Button>
        </div>
      )}
      <div className="level-selector">
        <label htmlFor="level-select">Chọn Level:</label>
        <select id="level-select" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
          <option value="IM">IM (Intermediate Mid)</option>
          <option value="IH">IH (Intermediate High)</option>
          <option value="AL">AL (Advanced Low)</option>
        </select>
      </div>
      <div className="button-group" style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Button onClick={handleFetchData} disabled={isLoading} style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>
          {isLoading ? 'Đang lấy câu hỏi...' : 'Lấy câu hỏi OPIC'}
        </Button>
        <Button onClick={handleProcessText} disabled={!opicText || isLoading} variant="secondary" style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>
          Xử lý văn bản
        </Button>
        <button
          aria-label="Nghe toàn bộ nội dung"
          style={{ background: '#fff', border: '1.5px solid #90caf9', borderRadius: 10, cursor: 'pointer', padding: '6px 12px', marginLeft: 8, minWidth: 48 }}
          onClick={() => speakText(opicText)}
          disabled={!opicText}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#4facfe"/>
            <path d="M16.5 12c0-1.77-.77-3.29-2-4.29v8.58c1.23-1 2-2.52 2-4.29z" fill="#4facfe"/>
            <path d="M14.5 3.97v2.06c3.39.49 6 3.39 6 6.97s-2.61 6.48-6 6.97v2.06c4.01-.51 7-3.86 7-9.03s-2.99-8.52-7-9.03z" fill="#4facfe"/>
          </svg>
        </button>
      </div>
      <textarea
        rows={8}
        value={opicText}
        onChange={e => setOpicText(e.target.value)}
        placeholder={
          `Hướng dẫn sử dụng:
• Nhấn "Lấy câu hỏi OPIC" để lấy 1 đề luyện tập mẫu tự động.
• Hoặc dán câu hỏi và câu trả lời OPIC của bạn vào đây.
• Sau đó nhấn "Xử lý văn bản" để bắt đầu luyện tập các kỹ năng: điền từ, sắp xếp câu, viết lại câu, thi thử.
• Bạn có thể nghe lại nội dung bằng nút loa.
• Nếu gặp lỗi, hãy thử chọn model AI khác hoặc kiểm tra lại nội dung.`
        }
        style={{ marginBottom: 8 }}
      />
      {processError && (
        <div style={{ color: 'red', marginTop: 8 }}>{processError}</div>
      )}
      {opicText && (
        <div className="preview-section">
          <h4>Xem trước nội dung</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {opicText.split('\n').map((line, idx) => {
              if (/^question[:：]/i.test(line)) {
                return <span key={idx} style={{ color: '#1976d2', fontWeight: 'bold' }}>{line}\n</span>;
              }
              if (/^(sample answer|answer|câu trả lời mẫu|câu trả lời)[:：]/i.test(line)) {
                return <span key={idx} style={{ color: '#388e3c', fontWeight: 'bold' }}>{line}\n</span>;
              }
              return <span key={idx}>{line}\n</span>;
            })}
          </pre>
        </div>
      )}
    </div>
  );
};

export default InputTab;