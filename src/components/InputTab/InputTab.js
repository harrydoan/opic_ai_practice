import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { callOpenRouterAPI } from '../../api/openRouterAPI';
import Button from '../common/Button';
import './InputTab.css';

const OPIC_PROMPT = `bạn là chuyên gia, thầy giáo về luyện thi OPIC chứng chỉ quốc tế. Hôm nay hãy gửi cho tôi 1 câu hỏi ngẫu nhiên trong bộ câu hỏi luyện thi OPIC và câu trả lời mẫu ở trình độ AL cho câu hỏi đó. Kết quả trả về chỉ là câu hỏi và câu trả lời mẫu không có chữ gì khác để tôi luyện tập`;

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