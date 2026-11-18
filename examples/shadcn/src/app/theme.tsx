import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { SurfaceProvider } from '@oyn/surface';

type Mode = 'light' | 'dark' | 'system';
const themeStorageKey = 'oyn:theme-mode';
function readSavedMode(): Mode {
  try {
    const saved = localStorage.getItem(themeStorageKey);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // Storage can be unavailable; theme switching should still work in memory.
  }
  return 'system';
}
const ThemeContext = createContext({ mode: 'system' as Mode, dark: false, setMode: (_mode: Mode) => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(readSavedMode);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = mode === 'system' ? systemDark : mode === 'dark';
  useEffect(() => {
    try { localStorage.setItem(themeStorageKey, mode); } catch {
      // Persistence is best-effort when browser storage is blocked.
    }
  }, [mode]);
  useLayoutEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);
  return <ThemeContext value={{ mode, dark, setMode }}><SurfaceProvider>{children}</SurfaceProvider></ThemeContext>;
}
