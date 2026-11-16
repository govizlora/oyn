import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { useSurface, useSurfaceMode } from '@oyn/surface';
import { ceramic } from '@oyn/material-ceramic';
import { buttonStructure, buttonSizes, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Only primary inverts the theme; other variants inherit the provider.
const neutral = ceramic();
const destructive = ceramic({ color: { light: '#dc2626', dark: '#ef4444' } });
const surfaceVariants = cva(buttonStructure, {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-foreground',
    },
    size: buttonSizes,
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
export type SurfaceButtonProps = Omit<ButtonProps, 'variant'> & {
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
};

export const SurfaceButton = React.forwardRef<HTMLButtonElement, SurfaceButtonProps>(
  ({ variant = 'default', size, className, asChild = false, ...props }, forwardedRef) => {
    const mode = useSurfaceMode();
    const primary = React.useMemo(() => ceramic({
      mode: mode === 'dark' ? 'light' : 'dark',
      color: mode === 'dark' ? '#e5e5e5' : '#171717',
    }), [mode]);
    const material = variant === 'default' ? primary : variant === 'destructive' ? destructive : neutral;
    const ref = useSurface<HTMLButtonElement>({ material }, forwardedRef);
    const Comp = asChild ? Slot : 'button';
    return <Comp {...props} ref={ref} data-surface-button="" className={cn(surfaceVariants({ variant, size }), className)} />;
  },
);
SurfaceButton.displayName = 'SurfaceButton';
