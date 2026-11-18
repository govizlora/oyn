import { useTheme } from '@/app/theme'
import { useComposedRefs } from '@radix-ui/react-compose-refs'
import { ceramic } from '@oyn/ceramic'
import { useSurface } from '@oyn/surface';
import type { ComponentProps } from 'react';
import { panelProps } from './materials';

/** Low-elevation card surface. Layout and scrolling belong to its consumer. */
export function PanelSurface({ ref: forwardedRef, ...props }: ComponentProps<'div'>) {
  const surfaceRef = useSurface({ appearance: ceramic, props: { colorScheme: useTheme().dark ? 'dark' : 'light', ...panelProps } })
  const ref = useComposedRefs(surfaceRef, forwardedRef);
  return <div ref={ref} data-surface-panel="" {...props} />;
}
