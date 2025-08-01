// Debug file để kiểm tra lỗi
console.log('Debug file loaded');

// Kiểm tra React có load không
if (typeof React === 'undefined') {
  console.error('React is not loaded!');
} else {
  console.log('React is loaded successfully');
}

// Kiểm tra DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  const root = document.getElementById('root');
  if (root) {
    console.log('Root element found:', root);
  } else {
    console.error('Root element not found!');
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});