import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/components/theme-provider';
import App from './App.jsx';
import './index.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="ct-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
