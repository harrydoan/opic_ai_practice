import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu');
  const [sentences, setSentences] = useState([]); // Chỉ cần danh sách câu gốc
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  
  const value = {
    activeTab, setActiveTab,
    sentences, setSentences,
    selectedModel, setSelectedModel,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};