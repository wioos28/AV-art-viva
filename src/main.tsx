/**
 * main.tsx
 * --------
 * Entry point: mount React + CSS.
 * Service worker + PWA được vite-plugin-pwa tự đăng ký (registerSW.js),
 * không cần làm thủ công.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './presentation/App';
import './presentation/styles/global.css';
import { applyTheme } from './presentation/theme';
import { loadSettings } from './infrastructure/storage/settings';

applyTheme(loadSettings().theme);

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
