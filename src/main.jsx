import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { startSyncEngine } from './sync/engine.js';

// Mulai sinkronisasi latar belakang otomatis
if (typeof window !== 'undefined') {
  startSyncEngine();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
