import React, { useState, useContext } from 'react';
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
  const { 
    setSentenceData,
    selectedModel, setSelectedModel, 
    setActiveTab,
    opicText, setOpicText
  } = useContext(AppContext);

  const handleFetchData = async () => {
    setIsLoading(true);
    const OPIC_PROMPT = `Give me one OPIC question and a sample answer at the AL (Advanced Low) level.
The answer should be 150–200 words, natural, fluent, and include personal details and storytelling.
Use informal spoken English.
Only output the question and the answer. Do not include any introductions, labels, titles, or extra text.`;
    const result = await callOpenRouterAPI(OPIC_PROMPT, selectedModel);
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
    const initialSentenceData = extractedSentences.map((text, index) => ({
      originalText: text,
      originalIndex: index,
      usedWords: []
    }));
    setSentenceData(initialSentenceData);
    setActiveTab('Luyện tập');
  };

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