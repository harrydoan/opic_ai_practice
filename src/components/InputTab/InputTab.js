import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

const InputTab = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { 
    selectedModel, setSelectedModel, 
    setActiveTab,
    opicText, setOpicText,
    setSentenceData // <-- Lấy hàm set mới từ context
  } = useContext(AppContext);

  // ... hàm handleFetchData giữ nguyên

  const handleProcessText = () => {
    const extractedSentences = opicText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(' ').length >= 5);
    
    if (extractedSentences.length === 0) return;

    // TẠO CẤU TRÚC DỮ LIỆU MỚI
    const initialSentenceData = extractedSentences.map((text, index) => ({
      originalText: text,
      originalIndex: index,
      usedWords: [] // Mảng "bộ nhớ" cho mỗi câu
    }));

    setSentenceData(initialSentenceData);
    setActiveTab('Luyện tập');
  };
  
  // ... phần còn lại của file giữ nguyên
  
  // -- Bỏ bớt code không liên quan để bạn dễ đọc --
  const models = [
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
      <textarea value={opicText} onChange={(e) => setOpicText(e.target.value)} rows="8" placeholder="Dán đoạn văn vào đây..."></textarea>
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