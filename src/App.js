import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from './context/AppContext';
import Tabs from './components/layout/Tabs';
import InputTab from './components/InputTab/InputTab';
import PracticeTab from './components/PracticeTab/PracticeTab';
import OrderingTab from './components/OrderingTab/OrderingTab';
import Card from './components/common/Card';
import RewriteTab from './components/RewriteTab/RewriteTab';
import MockTestTabSimple from './components/MockTestTab/MockTestTabSimple';

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
  }, []);

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 2000, background: '#fff', borderRadius: '0 0 0 12px', padding: '7px 18px 7px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', fontWeight: 500, color: '#1976d2', fontSize: 15, minWidth: 260, borderBottom: '1.5px solid #e3f2fd', borderLeft: '1.5px solid #e3f2fd' }}>
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
            {activeTab === 'Thi thử' && <MockTestTabSimple />}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default App;