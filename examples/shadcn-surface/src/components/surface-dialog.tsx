import * as React from 'react';
import { useSurface } from '@oyn/surface';
import { ceramic } from '@oyn/material-ceramic';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// One material owns the panel, highlight and projected shadow. Radix owns behavior.
const material = ceramic({ elevation: 128 });

export const SurfaceDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  Omit<React.ComponentPropsWithoutRef<typeof DialogContent>, 'unstyled'>
>(({ className, overlayClassName, ...props }, forwardedRef) => {
  const ref = useSurface({ material }, forwardedRef);
  return <DialogContent
    {...props}
    ref={ref}
    unstyled
    data-surface-dialog=""
    overlayClassName={cn('bg-black/20', overlayClassName)}
    className={cn('w-[calc(100%-2rem)] rounded-xl text-foreground', className)}
  />;
});
SurfaceDialogContent.displayName = 'SurfaceDialogContent';
