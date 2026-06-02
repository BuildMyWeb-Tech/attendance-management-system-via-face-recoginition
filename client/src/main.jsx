import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ── Register Service Worker for PWA ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg.scope);

        // Check for updates every 60 seconds
        setInterval(() => reg.update(), 60_000);

        // When a new SW is waiting, activate it immediately
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage('SKIP_WAITING');
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.error('[PWA] SW registration failed:', err));
  });
}