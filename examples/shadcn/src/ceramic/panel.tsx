import { useTheme } from '@/app/theme'
import { useComposedRefs } from '@radix-ui/react-compose-refs'
import { ceramic } from 'oyn/materials/ceramic'
import { useMaterial } from 'oyn/react';
import type { ComponentProps } from 'react';
import { panelProps } from './materials';

/** Low-elevation card surface. Layout and scrolling belong to its consumer. */
export function PanelSurface({ ref: forwardedRef, ...props }: ComponentProps<'div'>) {
  const surfaceRef = useMaterial({ appearance: ceramic, props: { colorScheme: useTheme().dark ? 'dark' : 'light', ...panelProps } })
  const ref = useComposedRefs(surfaceRef, forwardedRef);
  return <div ref={ref} data-surface-panel="" {...props} />;
}
