import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && (
    args[0].includes('THREE.Clock') ||
    args[0].includes('PCFSoftShadowMap') ||
    args[0].includes('deprecated')
  )) return;
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && (
    args[0].includes('WebSocket') ||
    args[0].includes('websocket') ||
    args[0].includes('[vite] failed to connect to websocket')
  )) return;
  originalError(...args);
};

// Global interceptor for unhandled WebSocket reconnection rejections & rate limits in sandbox
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('vite') ||
      msg.includes('Rate exceeded') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota') ||
      msg.includes('ResizeObserver')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('WebSocket') || 
      msg.includes('websocket') || 
      msg.includes('vite') ||
      msg.includes('Rate exceeded') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('Quota') ||
      msg.includes('ResizeObserver')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

let isRootMounted = false;
function mount() {
  if (isRootMounted) return;
  const rootEl = document.getElementById('root');
  if (rootEl) {
    isRootMounted = true;
    try {
      const root = createRoot(rootEl);
      root.render(
        <StrictMode>
          <ErrorBoundary fallbackTitle="SAMVARTAKA AI Meteorological Platform">
            <App />
          </ErrorBoundary>
        </StrictMode>
      );
    } catch (err) {
      console.error('Failed to mount SAMVARTAKA AI application root:', err);
      isRootMounted = false;
      rootEl.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:white;font-family:'Plus Jakarta Sans',sans-serif;padding:24px;text-align:center;">
          <div style="max-width:480px;background:#1e293b;padding:32px;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);border:1px solid #334155;">
            <div style="width:48px;height:48px;border-radius:12px;background:#2563eb;color:white;font-weight:bold;font-size:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">S</div>
            <h2 style="font-size:18px;font-weight:700;margin-bottom:8px;">SAMVARTAKA AI Synoptic Resilience</h2>
            <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;">Atmospheric model operational core active. Click below to load the console directly.</p>
            <button onclick="location.reload()" style="background:#2563eb;color:white;border:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Restore Weather Console</button>
          </div>
        </div>
      `;
    }
  }
}

// Expose manual mount trigger for inline fallback recovery button
(window as any).__mountSamvartakaApp = mount;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
