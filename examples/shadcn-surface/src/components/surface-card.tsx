import * as React from 'react';
import { useSurface } from '@oyn/surface';
import { ceramic } from '@oyn/material-ceramic';
import { cn } from '@/lib/utils';

const material = ceramic();

export const SurfaceCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, forwardedRef) => {
    const ref = useSurface<HTMLDivElement>({ material }, forwardedRef);
    return <div {...props} ref={ref} data-surface-card="" className={cn('rounded-xl text-card-foreground', className)} />;
  },
);
SurfaceCard.displayName = 'SurfaceCard';
