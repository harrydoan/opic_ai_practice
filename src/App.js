import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './context/AppContext';
import Tabs from './components/layout/Tabs';
import InputTab from './components/InputTab/InputTab';
import PracticeTab from './components/PracticeTab/PracticeTab';
import OrderingTab from './components/OrderingTab/OrderingTab';
import Card from './components/common/Card';
import RewriteTab from './components/RewriteTab/RewriteTab';
import MockTestTab from './components/MockTestTab/MockTestTab';

  const { activeTab } = useContext(AppContext);
  const [visitorCount, setVisitorCount] = useState(null);
  const [totalVisitorCount, setTotalVisitorCount] = useState(null);
function App() {

  useEffect(() => {
    // Sử dụng countapi.xyz để đếm số truy cập
    fetch('/.netlify/functions/visitor-count')
      .then(res => res.json())
      .then(data => {
        setVisitorCount(data.visitorCount);
        setTotalVisitorCount(data.totalVisitorCount);
      })
      .catch(() => {
        setVisitorCount(null);
        setTotalVisitorCount(null);
      });
  }, []);

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 1000, background: '#fff', borderRadius: 8, padding: '6px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', fontWeight: 500, color: '#1976d2', fontSize: 15 }}>
        {visitorCount !== null && totalVisitorCount !== null
          ? `👥 Đang truy cập: ${visitorCount} | Tổng truy cập: ${totalVisitorCount}`
          : '👥 Đang truy cập...'}
      </div>
      <header>
        <h1>Luyện thi OPIC</h1>
        <p>Học tiếng Anh qua việc điền từ, sắp xếp câu và luyện viết lại câu</p>
      </header>
      <main>
        <Card>
          <Tabs tabs={['Nhập liệu', 'Luyện tập', 'Sắp xếp câu', 'Viết lại câu', 'Thi thử']} />
          <div className="tab-content">
            {activeTab === 'Nhập liệu' && <InputTab />}
            {activeTab === 'Luyện tập' && <PracticeTab />}
            {activeTab === 'Sắp xếp câu' && <OrderingTab />}
            {activeTab === 'Viết lại câu' && <RewriteTab />}
            {activeTab === 'Thi thử' && <MockTestTab />}
          </div>
        </Card>
      </main>
    </div>
  );
// ...phần còn lại của App.js
}
export default App;
//git add . && git commit -m "Cập nhật logic Tab Sắp xếp và Luyện tập" && git push