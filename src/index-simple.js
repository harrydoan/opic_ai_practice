import React from 'react';
import ReactDOM from 'react-dom/client';
import AppSimple from './AppSimple';

console.log('Simple index.js loading...');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppSimple />
  </React.StrictMode>
);