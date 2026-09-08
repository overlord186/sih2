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
      createRoot(rootEl).render(
        <StrictMode>
          <ErrorBoundary fallbackTitle="SAMVARTAKA AI Meteorological Platform">
            <App />
          </ErrorBoundary>
        </StrictMode>
      );
    } catch (err) {
      console.error('Failed to mount SAMVARTAKA AI application root:', err);
      isRootMounted = false;
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
