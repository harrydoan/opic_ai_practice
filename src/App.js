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
        <p>Học tiếng Anh qua việc điền từ, sắp xếp câu và luyện viết lại câu</p>
      </header>
      <main>
        <Card>
          <Tabs tabs={['Nhập liệu', 'Luyện tập', 'Sắp xếp câu', 'Viết lại câu']} />
          <div className="tab-content">
            {activeTab === 'Nhập liệu' && <InputTab />}
            {activeTab === 'Luyện tập' && <PracticeTab />}
            {activeTab === 'Sắp xếp câu' && <OrderingTab />}
            {activeTab === 'Viết lại câu' && <RewriteTab />}
          </div>
        </Card>
      </main>
    </div>
  );
}

export default App;
//git add . && git commit -m "Cập nhật logic Tab Sắp xếp và Luyện tập" && git push