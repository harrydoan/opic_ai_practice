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
  const { 
    setSentenceData,
    selectedModel, setSelectedModel, 
    setActiveTab,
    opicText, setOpicText
  } = useContext(AppContext);

  const handleFetchData = async () => {
    setIsLoading(true);
    let levelText = '';
    if (selectedLevel === 'IM') levelText = 'Intermediate Mid';
    else if (selectedLevel === 'IH') levelText = 'Intermediate High';
    else levelText = 'Advanced Low';
    const OPIC_PROMPT = `Give me one OPIC question and a sample answer at the ${selectedLevel} (${levelText}) level.\nThe answer should be 150–200 words, natural, fluent, and include personal details and storytelling.\nUse informal spoken English.\nOnly output the question and the answer. Do not include any introductions, labels, titles, or extra text.`;
    const result = await callOpenRouterAPI(OPIC_PROMPT, selectedModel || 'gpt-3.5-turbo');
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

  const models = [
    // Các model miễn phí của OpenRouter
    { id: 'gpt-3.5-turbo', name: 'OpenAI: GPT-3.5 Turbo (Miễn phí)' },
    { id: 'openchat/openchat-3.5-0106', name: 'OpenChat: OpenChat 3.5 (Miễn phí)' },
    { id: 'nous-hermes-2-vision', name: 'Nous Hermes 2 Vision (Miễn phí)' },
    { id: 'mistral/mistral-small', name: 'Mistral: Mistral Small (Miễn phí)' },
    { id: 'google/gemini-flash-1.5', name: 'Google: Gemini Flash 1.5 (Miễn phí)' },
    { id: 'google/gemini-flash-2', name: 'Google: Gemini Flash 2 (Miễn phí)' },
    { id: 'xai/grok-1', name: 'Grok 1 (Miễn phí)' },
    { id: 'xai/grok-1.5', name: 'Grok 1.5 (Miễn phí)' },
    { id: 'xai/grok-1.5v', name: 'Grok 1.5V (Miễn phí)' },
    { id: 'xai/grok-4', name: 'Grok 4 (Miễn phí)' },
    // Các model trả phí phổ biến
    { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini (Cân bằng)' },
    { id: 'google/gemini-flash-1.5', name: 'Google: Gemini 1.5 Flash (Nhanh)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic: Claude 3.5 Sonnet (Mạnh mẽ)' },
  ];

  return (
    <div className="input-tab-container">
      <div className="model-selector">
        <label htmlFor="model-select">Chọn Model AI:</label>
        <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </div>
      <div className="level-selector">
        <label htmlFor="level-select">Chọn Level:</label>
        <select id="level-select" value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)}>
          <option value="IM">IM (Intermediate Mid)</option>
          <option value="IH">IH (Intermediate High)</option>
          <option value="AL">AL (Advanced Low)</option>
        </select>
      </div>
      <div className="button-group">
        <Button onClick={handleFetchData} disabled={isLoading}>
          {isLoading ? 'Đang lấy câu hỏi...' : 'Lấy câu hỏi OPIC'}
        </Button>
        <Button onClick={handleProcessText} disabled={!opicText || isLoading} variant="secondary">
          Xử lý văn bản
        </Button>
        <button
          aria-label="Nghe toàn bộ nội dung"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 8 }}
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