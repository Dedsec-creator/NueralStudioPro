import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerSW} from 'virtual:pwa-register';

// Superpowered Offline Web App (PWA) & Native Desktop Persistent Local Caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] New application version available; updating service worker...');
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[PWA] NeuralTune Ultra is ready for offline operation & desktop installation.');
    },
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered with scope:', registration?.scope);
    },
    onRegisterError(error) {
      console.warn('[PWA] Service Worker registration note:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
