import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

type Appearance = 'original' | 'ceramic';
const Context = createContext({ appearance: 'original' as Appearance, setAppearance: (_value: Appearance) => {} });
export const useAppearance = () => useContext(Context);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    try { return localStorage.getItem('oyn:appearance') === 'ceramic' ? 'ceramic' : 'original'; }
    catch { return 'original'; }
  });
  useEffect(() => { try { localStorage.setItem('oyn:appearance', appearance); } catch {} }, [appearance]);
  useLayoutEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    return () => { delete document.documentElement.dataset.appearance; };
  }, [appearance]);
  return <Context value={{ appearance, setAppearance }}>{children}</Context>;
}

