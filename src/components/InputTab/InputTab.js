import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

// Thay thế dòng này:
// const OPIC_PROMPT = `bạn là chuyên gia, thầy giáo về luyện thi OPIC...`;

// Bằng dòng này:
const OPIC_PROMPT = `You are an expert OPIC test instructor. Provide one random question from the OPIC test set and a sample answer for the AL (Advanced Low) level. The result must contain ONLY the question and the sample answer, with no other text, labels, or formatting like "Question:" or "Answer:".`;

const InputTab = () => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { processAndStoreText, sentences } = useContext(AppContext);

  const handleFetchData = async () => {
    setIsLoading(true);
    const result = await callOpenRouterAPI(OPIC_PROMPT);
    setInputText(result);
    setIsLoading(false);
  };

  const handleProcess = () => {
    processAndStoreText(inputText);
  };

  return (
    <div className="input-tab-container">
      <p>Nhập đoạn văn tiếng Anh của bạn hoặc lấy dữ liệu mẫu từ AI.</p>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Dán đoạn văn vào đây..."
        rows="10"
        disabled={isLoading}
      ></textarea>
      <div className="button-group">
        <Button onClick={handleFetchData} disabled={isLoading} variant="secondary">
          {isLoading ? <div className="spinner"></div> : '🤖 Lấy dữ liệu OPIC'}
        </Button>
        <Button onClick={handleProcess} disabled={!inputText || isLoading}>
          📝 Xử lý & Bắt đầu
        </Button>
      </div>
      
      {sentences.length > 0 && (
         <div className="preview-section">
            <h4>Xem trước các câu đã xử lý:</h4>
            <ul>
                {sentences.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
        </div>
      )}
    </div>
  );
};

export default InputTab;