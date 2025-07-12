import React, { createContext, useState } from 'react';
import useQuestionGenerator from '../hooks/useQuestionGenerator';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu'); // 'Nhập liệu', 'Luyện tập', 'Sắp xếp câu'
  const [sentences, setSentences] = useState([]);
  
  const { 
    fillInTheBlankQuestions, 
    setFillInTheBlankQuestions, // <-- THÊM DÒNG NÀY
    orderingQuestions, 
    generateQuestions 
  } = useQuestionGenerator();

  const processAndStoreText = (text) => {
    // Tách đoạn văn thành các câu
    const extractedSentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(' ').length >= 5);
    
    setSentences(extractedSentences);
    generateQuestions(extractedSentences); // Tạo câu hỏi từ các câu đã xử lý
    
    // Tự động chuyển tab nếu có câu hỏi được tạo ra
    if (extractedSentences.length > 0) {
      setActiveTab('Luyện tập');
    }
  };

  const value = {
    activeTab,
    setActiveTab,
    sentences,
    fillInTheBlankQuestions,
    setFillInTheBlankQuestions, // <-- THÊM DÒNG NÀY
    orderingQuestions,
    processAndStoreText,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};