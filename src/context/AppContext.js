import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu');
  // Thay thế `sentences` bằng `sentenceData` với cấu trúc mới
  const [sentenceData, setSentenceData] = useState([]);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [opicText, setOpicText] = useState('');

  const value = {
    activeTab, setActiveTab,
    sentenceData, setSentenceData, // <-- Thay đổi ở đây
    selectedModel, setSelectedModel,
    opicText, setOpicText,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};