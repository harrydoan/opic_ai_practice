import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

// ... (phần models và createQuestionPrompt giữ nguyên hoặc xóa đi vì không dùng ở đây nữa)

const InputTab = () => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setSentences, selectedModel, setSelectedModel, setActiveTab } = useContext(AppContext);

  const handleFetchData = async () => {
    setIsLoading(true);
    const OPIC_PROMPT = `You are an expert OPIC test instructor...`; // Giữ nguyên prompt này
    const result = await callOpenRouterAPI(OPIC_PROMPT, selectedModel);
    setInputText(result);
    setIsLoading(false);
  };

  const handleProcessText = () => {
    const extractedSentences = inputText
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

      <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} rows="8" placeholder="Dán đoạn văn vào đây..."></textarea>
      
      <div className="button-group">
        <Button onClick={handleFetchData} disabled={isLoading}>
          {isLoading ? <div className="spinner"></div> : '🤖 Lấy dữ liệu OPIC'}
        </Button>
        <Button onClick={handleProcessText} disabled={!inputText}>
          📝 Bắt đầu Luyện tập
        </Button>
      </div>
    </div>
  );
};

export default InputTab;