import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import './OrderingTab.css'; // Sẽ tạo file này

const OrderingTab = () => {
  const { orderingQuestions } = useContext(AppContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    // Reset khi câu hỏi thay đổi
    setCurrentIndex(0);
    setIsAnswered(false);
    setSelectedOption(null);
  }, [orderingQuestions]);

  const currentQuestion = orderingQuestions[currentIndex];

  const handleSelect = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
  };

  const handleNext = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    if (currentIndex < orderingQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("Đã hoàn thành phần sắp xếp câu!");
      setCurrentIndex(0); // Bắt đầu lại
    }
  };

  const getButtonClass = (option) => {
    if (!isAnswered) return '';
    if (option === currentQuestion.correctPosition) return 'correct';
    if (option === selectedOption) return 'incorrect';
    return 'disabled';
  };
  
  if (!orderingQuestions || orderingQuestions.length === 0) {
    return <p>Chưa có dữ liệu để luyện tập. Vui lòng quay lại tab "Nhập liệu".</p>;
  }

  return (
    <div className="ordering-tab-container">
      <h3>❓ Câu này ở vị trí thứ mấy trong đoạn văn?</h3>
      <div className="sentence-box">
        "{currentQuestion.sentence}"
      </div>
      <div className="ordering-options">
        {currentQuestion.options.map(option => (
          <button 
            key={option}
            className={`ordering-btn ${getButtonClass(option)}`}
            onClick={() => handleSelect(option)}
            disabled={isAnswered}
          >
            Vị trí {option}
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className="ordering-feedback">
          <p>{selectedOption === currentQuestion.correctPosition ? '✅ Chính xác!' : '❌ Sai rồi!'}</p>
          <p>{currentQuestion.explanation}</p>
          <button onClick={handleNext} className="next-btn">Tiếp theo →</button>
        </div>
      )}
    </div>
  );
};

export default OrderingTab;