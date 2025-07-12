import React, { useContext } from 'react';
import { AppContext } from './context/AppContext';
import Tabs from './components/layout/Tabs';
import InputTab from './components/InputTab/InputTab';
import PracticeTab from './components/PracticeTab/PracticeTab';
import OrderingTab from './components/OrderingTab/OrderingTab';
import Card from './components/common/Card';

function App() {
  const { activeTab } = useContext(AppContext);

  return (
    <div className="app-container">
      <header>
        <h1>Luyện thi OPIC</h1>
        <p>Học tiếng Anh qua việc điền từ và sắp xếp câu</p>
      </header>
      <main>
        <Card>
          <Tabs />
          <div className="tab-content">
            {activeTab === 'Nhập liệu' && <InputTab />}
            {activeTab === 'Luyện tập' && <PracticeTab />}
            {activeTab === 'Sắp xếp câu' && <OrderingTab />}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default App;