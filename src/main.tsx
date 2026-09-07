import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return;
  originalWarn(...args);
};

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
