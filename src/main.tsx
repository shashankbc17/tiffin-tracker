import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initThemeListener } from './services/theme';

// Initialize theme subsystem (persisted or system preference)
initThemeListener();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

