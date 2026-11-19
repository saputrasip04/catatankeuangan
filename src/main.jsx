import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { startSyncEngine, kickSync } from './sync/engine.js';
import { checkAutoSetupFromUrl } from './lib/settings.js';

// Mulai sinkronisasi latar belakang otomatis
if (typeof window !== 'undefined') {
  const autoConfigured = checkAutoSetupFromUrl();
  startSyncEngine();
  if (autoConfigured) {
    kickSync();
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
