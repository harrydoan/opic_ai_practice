import React, { useState, useContext, useEffect } from 'react';
import { speakText } from '../../utils/speech';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI, batchTranslateSentences } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

function InputTab() {
  const { setSentenceData, setActiveTab, opicText, setOpicText, setSelectedModel: setGlobalModel, setSentenceTranslations, sentenceTranslations } = useContext(AppContext);
  const [selectedModel, setSelectedModel] = useState('google/gemma-3-27b-it:free');
  // Removed selectedLevel and setSelectedLevel (no longer needed)
  const [showPromptAdjust, setShowPromptAdjust] = useState(false);
  // The full prompt for AI, editable by user
  const defaultPrompt = `Hãy cho tôi 1 câu hỏi và ví dụ về 1 câu trong bộ đè thi OPIC
Câu trả lời chỉ có câu hỏi và ví dụ không có bất kỳ từ nào khác.
Bỏ cả chữ "câu hỏi" và "Trả lời" đi
Chủ đề: bất kỳ`;
  const [aiPrompt, setAiPrompt] = useState(() => {
    const savedPrompt = localStorage.getItem('opic_ai_prompt');
    // If no saved prompt, use default
    if (!savedPrompt) {
      localStorage.setItem('opic_ai_prompt', defaultPrompt);
      return defaultPrompt;
    }
    // If saved prompt is exactly the default, treat as default
    if (savedPrompt === defaultPrompt) {
      return defaultPrompt;
    }
    // Otherwise, use user's last edit
    return savedPrompt;
  });
  // Save prompt to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('opic_ai_prompt', aiPrompt);
  }, [aiPrompt]);
  const [isLoading, setIsLoading] = useState(false);
  const [processError, setProcessError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedFiles, setSavedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => { refreshSavedFiles(); }, []);

  function cleanOpicResponse(rawText) {
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
  }

  function refreshSavedFiles() {
    const files = Object.keys(localStorage)
      .filter(k => k.startsWith('opic_practice_') && !k.endsWith('_time'))
      .map(k => ({ key: k, time: localStorage.getItem(k + '_time') ? parseInt(localStorage.getItem(k + '_time')) : 0 }))
      .sort((a, b) => b.time - a.time)
      .map(f => f.key);
    setSavedFiles(files);
  }

  function savePracticeData() {
    if (!opicText) return;
    let name = saveName.trim();
    if (!name) {
      name = prompt('Nhập tên cho bài luyện tập:');
      if (!name) return;
    }
    const dataToSave = { opicText, sentenceTranslations };
    localStorage.setItem('opic_practice_' + name, JSON.stringify(dataToSave));
    localStorage.setItem('opic_practice_' + name + '_time', Date.now().toString());
    setSaveName('');
    refreshSavedFiles();
    alert('Đã lưu bài luyện tập với tên: ' + name);
  }

  function loadPracticeData() {
    refreshSavedFiles();
    setShowLoadDialog(true);
  }

  function handleLoadFile(key) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOpicText(parsed.opicText || '');
        if (parsed.sentenceTranslations) setSentenceTranslations(parsed.sentenceTranslations);
      } catch {
        setOpicText(saved);
      }
    }
    setShowLoadDialog(false);
  }

  useEffect(() => { if (setGlobalModel) setGlobalModel(selectedModel); }, [selectedModel, setGlobalModel]);

  async function handleFetchData() {
    setIsLoading(true);
    // No level selection logic needed; use prompt as-is
    const result = await callOpenRouterAPI(aiPrompt, selectedModel);
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
  }

  async function handleProcessText() {
    setProcessError('');
    setIsProcessing(true);
    const extractedSentences = opicText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(' ').length >= 5);
    if (extractedSentences.length === 0) {
      setProcessError('Không tìm thấy câu hợp lệ. Vui lòng kiểm tra lại nội dung!');
      setIsProcessing(false);
      return;
    }
    let translations = [];
    try {
      translations = await batchTranslateSentences(extractedSentences, selectedModel);
    } catch (e) {
      translations = extractedSentences.map(() => '');
    }
    setSentenceTranslations(translations);
    const initialSentenceData = extractedSentences.map((text, index) => ({
      originalText: text,
      originalIndex: index,
      usedWords: [],
    }));
    setSentenceData(initialSentenceData);
    setIsProcessing(false);
    setActiveTab('Luyện tập');
  }

  function handleDeleteFile(key) {
    localStorage.removeItem(key);
    localStorage.removeItem(key + '_time');
    setSelectedFiles(prev => prev.filter(k => k !== key));
    refreshSavedFiles();
  }
  function handleDeleteSelected() {
    selectedFiles.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(key + '_time');
    });
    setSelectedFiles([]);
    refreshSavedFiles();
  }
  function handleDownloadFile(key) {
    const data = localStorage.getItem(key);
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = key.replace('opic_practice_', '') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleDownloadSelected() {
    selectedFiles.forEach(key => handleDownloadFile(key));
  }

  return (
    <div className="input-tab-container">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Button onClick={savePracticeData} variant="secondary" style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>Lưu bài luyện tập</Button>
        <Button onClick={loadPracticeData} variant="secondary" style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>Tải bài đã lưu</Button>
        <Button onClick={() => setShowPromptAdjust(v => !v)} variant="secondary" style={{ minWidth: 180, fontSize: 16, borderRadius: 10 }}>
          Điều chỉnh yêu cầu
        </Button>
      </div>
      {showPromptAdjust && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <textarea
            rows={10}
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ width: '100%', maxWidth: 800, fontSize: 15, borderRadius: 8, border: '1.5px solid #90caf9', padding: 8, marginBottom: 4 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Bạn có thể chỉnh sửa toàn bộ prompt gửi cho AI để lấy đề luyện tập theo ý muốn.<br />
            <b>Lưu ý:</b> Nếu thay đổi level, chương trình sẽ tự động thay thế phần level trong prompt.
          </div>
          <Button onClick={() => setShowPromptAdjust(false)} variant="secondary">Đóng</Button>
        </div>
      )}
      {showLoadDialog && (
        <div style={{ background: '#fff', border: '1.5px solid #90caf9', borderRadius: 10, padding: 16, position: 'absolute', zIndex: 10, top: 80, left: '50%', transform: 'translateX(-50%)', minWidth: 400 }}>
          <h4>Chọn bài luyện tập đã lưu</h4>
          {savedFiles.length === 0 ? (
            <div style={{ color: 'gray' }}>Không có bài luyện tập nào.</div>
          ) : (
            <form onSubmit={e => e.preventDefault()}>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {savedFiles.map(key => (
                    <li key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderBottom: '1px solid #e3f2fd', paddingBottom: 4 }}>
                      <input
                        type="checkbox"
                        checked={selectedFiles?.includes(key) || false}
                        onChange={e => {
                          if (e.target.checked) setSelectedFiles(prev => [...prev, key]);
                          else setSelectedFiles(prev => prev.filter(k => k !== key));
                        }}
                        style={{ marginRight: 6 }}
                      />
                      <span style={{ flex: 1, fontWeight: 500 }}>{key.replace('opic_practice_', '')}</span>
                      <Button onClick={() => handleLoadFile(key)} style={{ minWidth: 80, fontSize: 13 }}>Tải lên</Button>
                      <Button onClick={() => handleDeleteFile(key)} style={{ minWidth: 60, fontSize: 13, background: '#e57373', color: '#fff' }}>Xoá</Button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button onClick={handleDownloadSelected} disabled={selectedFiles.length === 0} variant="secondary">Tải xuống đã chọn</Button>
                <Button onClick={handleDeleteSelected} disabled={selectedFiles.length === 0} style={{ background: '#e57373', color: '#fff' }}>Xoá đã chọn</Button>
                <Button onClick={() => setShowLoadDialog(false)} variant="secondary">Đóng</Button>
              </div>
            </form>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <div>
          <label htmlFor="model-select">Chọn Model:</label>
          <select id="model-select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
            <option value="google/gemma-3-27b-it:free">Gemma 3 27B IT (Google, free)</option>
            <option value="qwen/qwen3-235b-a22b-07-25:free">Qwen3-235B (Qwen, free)</option>
            <option value="openai/gpt-4.1-nano">GPT-4.1-nano (OpenAI, trả phí)</option>
            <option value="deepseek/deepseek-r1-0528:free">DeepSeek R1 (free)</option>
          </select>
        </div>
      </div>
      {selectedModel === 'openai/gpt-4.1-nano' && (
        <div style={{ color: 'red', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>
          ⚠️ Model này có thể mất phí khi sử dụng. Vui lòng kiểm tra tài khoản trước khi chọn!
        </div>
      )}
      <div className="button-group" style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Button onClick={handleFetchData} disabled={isLoading} style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>
          {isLoading ? 'Đang lấy câu hỏi...' : 'Lấy câu hỏi OPIC'}
        </Button>
        <Button onClick={handleProcessText} disabled={!opicText || isLoading || isProcessing} variant="secondary" style={{ minWidth: 160, fontSize: 16, borderRadius: 10 }}>
          {isProcessing ? 'Đang xử lý...' : 'Xử lý văn bản'}
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
        placeholder={`Hướng dẫn sử dụng:\n• Nhấn "Lấy câu hỏi OPIC" để lấy 1 đề luyện tập mẫu tự động.\n• Hoặc dán câu hỏi và câu trả lời OPIC của bạn vào đây.\n• Sau đó nhấn "Xử lý văn bản" để bắt đầu luyện tập các kỹ năng: điền từ, sắp xếp câu, viết lại câu, thi thử.\n• Bạn có thể nghe lại nội dung bằng nút loa.\n• Nếu gặp lỗi, hãy thử chọn model AI khác hoặc kiểm tra lại nội dung.`}
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
}
export default InputTab;