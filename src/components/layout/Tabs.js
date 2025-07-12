import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import './layout.css';

const Tabs = () => {
  const { activeTab, setActiveTab } = useContext(AppContext);
  const tabs = ['Nhập liệu', 'Luyện tập', 'Sắp xếp câu'];

  return (
    <div className="tab-buttons">
      {tabs.map(tab => (
        <button
          key={tab}
          className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default Tabs;