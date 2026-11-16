import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** The original SidebarInset's paint, separated from the persistent app layout. */
export function OriginalPanelSurface({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-background md:shadow-sm', className)} {...props} />;
}
