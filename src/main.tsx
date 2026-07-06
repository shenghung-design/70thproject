import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely suppress cross-origin frame access security errors (e.g., $$typeof on cross-origin Window)
// which are commonly triggered when embedded inside an iframe (like in AI Studio previews).
if (typeof window !== 'undefined') {
  const isSecurityError = (err: any) => {
    if (!err) return false;
    const msg = typeof err === 'string' ? err : err.message || '';
    const name = err.name || '';
    return (
      name === 'SecurityError' ||
      msg.includes('SecurityError') ||
      msg.includes('$$typeof') ||
      msg.includes('Blocked a frame with origin')
    ) && (
      msg.includes('cross-origin frame') ||
      msg.includes('origin') ||
      msg.includes('Frame') ||
      msg.includes('Window')
    );
  };

  window.addEventListener('error', (event) => {
    if (isSecurityError(event.error) || isSecurityError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (isSecurityError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
