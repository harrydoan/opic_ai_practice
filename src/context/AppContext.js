import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu');
  const [sentences, setSentences] = useState([]);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [opicText, setOpicText] = useState(''); // <-- STATE MỚI ĐỂ LƯU VĂN BẢN

  const value = {
    activeTab, setActiveTab,
    sentences, setSentences,
    selectedModel, setSelectedModel,
    opicText, setOpicText, // <-- THÊM VÀO CONTEXT
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};