import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';

import { App } from './App';
import { Toaster } from './components/ui/sonner';
import { I18nProvider } from './i18n/i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="agnostic-theme"
      enableSystem={false}
    >
      <I18nProvider>
        <App />
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
);
