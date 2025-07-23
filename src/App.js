import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './context/AppContext';
import Tabs from './components/layout/Tabs';
import InputTab from './components/InputTab/InputTab';
import PracticeTab from './components/PracticeTab/PracticeTab';
import OrderingTab from './components/OrderingTab/OrderingTab';
import Card from './components/common/Card';
import RewriteTab from './components/RewriteTab/RewriteTab';
import MockTestTab from './components/MockTestTab/MockTestTab';


function App() {
  const { activeTab } = useContext(AppContext);
  const [visitorCount, setVisitorCount] = useState(null);
  const [totalVisitorCount, setTotalVisitorCount] = useState(null);
  const [loadingVisitor, setLoadingVisitor] = useState(true);
  const [visitorError, setVisitorError] = useState('');

  // Hàm lấy số truy cập từ Netlify Function
  const fetchVisitorCount = async () => {
    setLoadingVisitor(true);
    setVisitorError('');
    try {
      const res = await fetch('/.netlify/functions/visitor-count');
      if (!res.ok) throw new Error('Không thể lấy dữ liệu truy cập');
      const data = await res.json();
      setVisitorCount(data.visitorCount);
      setTotalVisitorCount(data.totalVisitorCount);
    } catch (err) {
      setVisitorCount(null);
      setTotalVisitorCount(null);
      setVisitorError('Không thể lấy dữ liệu truy cập');
    } finally {
      setLoadingVisitor(false);
    }
  };

  useEffect(() => {
    fetchVisitorCount();
    // Nếu muốn cập nhật realtime, có thể dùng interval:
    // const interval = setInterval(fetchVisitorCount, 10000);
    // return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 1000, background: '#fff', borderRadius: 8, padding: '6px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', fontWeight: 500, color: '#1976d2', fontSize: 15, minWidth: 260 }}>
        {loadingVisitor ? '👥 Đang tải thống kê...' :
          visitorError ? (
            <span style={{ color: 'red' }}>Lỗi thống kê truy cập</span>
          ) : (
            visitorCount !== null && totalVisitorCount !== null
              ? `👥 Đang truy cập: ${visitorCount} | Tổng truy cập: ${totalVisitorCount}`
              : '👥 Đang truy cập...')
        }
        <button onClick={fetchVisitorCount} style={{ marginLeft: 12, fontSize: 13, border: 'none', background: '#e3f2fd', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>↻</button>
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