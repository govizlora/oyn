import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/app/theme';
import { AppearanceProvider } from '@/app/appearance';
import { Toaster } from '@/app/ui/sonner';
import { DashboardPreview } from '@/app/dashboard-preview';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <ThemeProvider>
        <DashboardPreview />
        <Toaster />
      </ThemeProvider>
    </AppearanceProvider>
  </StrictMode>,
);
