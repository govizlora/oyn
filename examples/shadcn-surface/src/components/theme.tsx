import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { SurfaceProvider } from '@oyn/surface';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { useSidebar } from '@/components/ui/sidebar';

type Mode = 'light' | 'dark' | 'system';
const ThemeContext = createContext({ mode: 'system' as Mode, dark: false, setMode: (_mode: Mode) => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('system');
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = mode === 'system' ? systemDark : mode === 'dark';
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
  return <ThemeContext value={{ mode, dark, setMode }}><SurfaceProvider mode={dark ? 'dark' : 'light'}>{children}</SurfaceProvider></ThemeContext>;
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  return <ButtonGroup aria-label="Color mode" orientation={collapsed ? 'vertical' : 'horizontal'} className="w-full">
    {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([value, label, Icon]) =>
      <Button key={value} type="button" size="sm" variant={mode === value ? 'default' : 'outline'} aria-label={label} aria-pressed={mode === value} title={label} onClick={() => setMode(value)} className="min-w-0 flex-1 group-data-[collapsible=icon]:px-0">
        <Icon /><span className="group-data-[collapsible=icon]:hidden">{label}</span>
      </Button>)}
  </ButtonGroup>;
}
