import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

// HÀM MỚI: Dọn dẹp văn bản trả về từ AI
const cleanOpicResponse = (rawText) => {
  if (!rawText) return '';

  // Danh sách các tiền tố thừa cần loại bỏ (cả tiếng Anh và tiếng Việt)
  const prefixesToRemove = [
    'Question:',
    'Sample Answer:',
    'Answer:',
    'Câu hỏi:',
    'Câu trả lời mẫu:',
    'Câu trả lời:'
  ];

  // Tách văn bản thành từng dòng, dọn dẹp từng dòng, rồi nối lại
  const cleanedLines = rawText.split('\n').map(line => {
    let cleanedLine = line.trim();
    for (const prefix of prefixesToRemove) {
      if (cleanedLine.toLowerCase().startsWith(prefix.toLowerCase())) {
        // Xóa tiền tố và các khoảng trắng thừa
        cleanedLine = cleanedLine.substring(prefix.length).trim();
        break; // Chuyển sang dòng tiếp theo khi đã tìm thấy và xóa
      }
    }
    return cleanedLine;
  });

  // Nối các dòng đã dọn dẹp và xóa khoảng trắng thừa ở đầu/cuối
  return cleanedLines.join('\n').trim();
};


const InputTab = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { 
    setSentences, 
    selectedModel, setSelectedModel, 
    setActiveTab,
    opicText, setOpicText
  } = useContext(AppContext);

  const handleFetchData = async () => {
    setIsLoading(true);
    const OPIC_PROMPT = `Act as an OPIC test expert. Your task is to provide one random question and a corresponding sample answer for the AL (Advanced Low) level. The output should only contain the question and the answer text, without any labels like "Question:" or "Answer:".`;

    const result = await callOpenRouterAPI(OPIC_PROMPT, selectedModel);
    
    // SỬ DỤNG HÀM DỌN DẸP TRƯỚC KHI LƯU VÀO STATE
    const cleanedText = cleanOpicResponse(result);
    setOpicText(cleanedText);
    
    setIsLoading(false);
  };

  const handleProcessText = () => {
    const extractedSentences = opicText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(' ').length >= 5);
    
    if (extractedSentences.length === 0) return;

    setSentences(extractedSentences);
    setActiveTab('Luyện tập');
  };

  const models = [
    { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini (Cân bằng)' },
    { id: 'google/gemini-flash-1.5', name: 'Google: Gemini 1.5 Flash (Nhanh)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic: Claude 3.5 Sonnet (Mạnh mẽ)' },
    { id: 'google/gemma-3n-2b:free', name: 'Google: Gemma 3N 2B (Miễn phí)' },
  ];

  return (
    <div className="input-tab-container">
      <div className="model-selector">
        <label htmlFor="model-select">Chọn Model AI:</label>
        <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </div>

      <textarea value={opicText} onChange={(e) => setOpicText(e.target.value)} rows="8" placeholder="Dán đoạn văn vào đây hoặc lấy dữ liệu tự động..."></textarea>
      
      <div className="button-group">
        <Button onClick={handleFetchData} disabled={isLoading}>
          {isLoading ? <div className="spinner"></div> : '🤖 Lấy dữ liệu OPIC'}
        </Button>
        <Button onClick={handleProcessText} disabled={!opicText}>
          📝 Bắt đầu Luyện tập
        </Button>
      </div>
    </div>
  );
};

export default InputTab;