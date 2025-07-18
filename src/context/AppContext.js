import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('Nhập liệu');
  const [sentenceData, setSentenceData] = useState([]);
  // Đặt mặc định là model miễn phí nhiều token nhất: gpt-3.5-turbo
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
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