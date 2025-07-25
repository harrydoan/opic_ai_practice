import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu');
  const [sentenceData, setSentenceData] = useState([]);
  const [sentenceTranslations, setSentenceTranslations] = useState([]); // [{original, translation}]
  const [opicText, setOpicText] = useState('');
  // Model AI dùng chung toàn app
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-pro-exp-03-25');
  // STATE MỚI: Lưu lại thứ tự đúng do người dùng sắp xếp
  const [userDefinedOrder, setUserDefinedOrder] = useState(null);

  const value = {
    activeTab, setActiveTab,
    sentenceData, setSentenceData,
    sentenceTranslations, setSentenceTranslations,
    opicText, setOpicText,
    userDefinedOrder, setUserDefinedOrder,
    selectedModel, setSelectedModel
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};