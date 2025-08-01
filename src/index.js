import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import './styles/global.css';
import './styles/animations.css';
import './debug.js'; // Import debug file

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: 'red',
          background: '#fff',
          margin: '20px',
          borderRadius: '8px'
        }}>
          <h2>⚠️ Có lỗi xảy ra</h2>
          <p>Vui lòng refresh trang hoặc liên hệ admin.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh trang
          </button>
          <details style={{ marginTop: '10px', textAlign: 'left' }}>
            <summary>Chi tiết lỗi</summary>
            <pre style={{ 
              background: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);