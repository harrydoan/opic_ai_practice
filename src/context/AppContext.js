import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu');
  const [sentenceData, setSentenceData] = useState([]);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
  const [opicText, setOpicText] = useState('');
  
  // STATE MỚI: Lưu lại thứ tự đúng do người dùng sắp xếp
  const [userDefinedOrder, setUserDefinedOrder] = useState(null);

  const value = {
    activeTab, setActiveTab,
    sentenceData, setSentenceData,
    selectedModel, setSelectedModel,
    opicText, setOpicText,
    userDefinedOrder, setUserDefinedOrder // <-- Thêm vào context
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};