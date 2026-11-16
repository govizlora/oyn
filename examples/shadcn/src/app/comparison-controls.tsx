import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/app/appearance';
import { useTheme } from '@/app/theme';
import { cn } from '@/lib/utils';

const control = 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring';

export function AppearanceToggle() {
  const { appearance, setAppearance } = useAppearance();
  return <div role="group" aria-label="Rendering mode" className="inline-flex shrink-0 gap-0.5 rounded-lg border bg-muted/60 p-0.5">
    {(['original', 'ceramic'] as const).map(value => <button
      key={value} type="button" aria-pressed={appearance === value}
      onClick={() => setAppearance(value)}
      className={cn(control, appearance === value ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
    >{value === 'original' ? 'Original' : 'Ceramic'}</button>)}
  </div>;
}

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return <div role="group" aria-label="Color mode" className="inline-flex shrink-0 gap-0.5 rounded-lg border p-0.5">
    {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'System', Monitor]] as const).map(([value, label, Icon]) =>
      <button key={value} type="button" aria-label={label} title={label} aria-pressed={mode === value}
        onClick={() => setMode(value)} className={cn(control, 'px-2', mode === value ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
        <Icon className="size-4" />
      </button>)}
  </div>;
}

export function ComparisonControls() {
  return <div className="flex items-center gap-2"><AppearanceToggle /><ThemeToggle /></div>;
}
