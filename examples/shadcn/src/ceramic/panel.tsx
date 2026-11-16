import { useSurface } from '@oyn/surface';
import type { ComponentProps } from 'react';
import { panelMaterial } from './materials';

/** Low-elevation card surface. Layout and scrolling belong to its consumer. */
export function PanelSurface({ ref: forwardedRef, ...props }: ComponentProps<'div'>) {
  const ref = useSurface<HTMLDivElement>({ material: panelMaterial }, forwardedRef);
  return <div ref={ref} data-surface-panel="" {...props} />;
}
