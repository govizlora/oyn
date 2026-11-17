import { ceramic } from '@oyn/ceramic'
import { useSurface } from '@oyn/surface';
import type { ComponentProps } from 'react';
import { panelProps } from './materials';

/** Low-elevation card surface. Layout and scrolling belong to its consumer. */
export function PanelSurface({ ref: forwardedRef, ...props }: ComponentProps<'div'>) {
  const ref = useSurface({ appearance: ceramic, props: panelProps }, forwardedRef);
  return <div ref={ref} data-surface-panel="" {...props} />;
}
