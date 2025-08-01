import React from 'react';

function AppSimple() {
  console.log('AppSimple rendering...');
  
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1>🎯 Luyện thi OPIC - Test Version</h1>
      <p>Nếu bạn thấy trang này, React đang hoạt động bình thường.</p>
      
      <div style={{ 
        background: 'white', 
        color: '#333', 
        padding: '20px', 
        borderRadius: '10px',
        margin: '20px auto',
        maxWidth: '500px'
      }}>
        <h3>✅ App đã load thành công!</h3>
        <p>Bây giờ bạn có thể:</p>
        <ul style={{ textAlign: 'left' }}>
          <li>Quay lại trang chính để sử dụng đầy đủ tính năng</li>
          <li>Kiểm tra console để xem debug logs</li>
          <li>Liên hệ admin nếu vẫn gặp vấn đề</li>
        </ul>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '10px'
          }}
        >
          Refresh trang
        </button>
      </div>
    </div>
  );
}

export default AppSimple;