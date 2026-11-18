"use client"

import { useComposedRefs } from '@radix-ui/react-compose-refs'

import { ceramic } from '@oyn/ceramic'

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { useSurface } from "@oyn/surface"
import { insetProps, neutralProps } from "@/ceramic/materials"
import { cn } from "@/lib/utils"


function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} orientation={orientation}
    className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)} {...props} />
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:flex-col",
  { variants: { variant: { default: "h-9 rounded-xl p-1 group-data-[orientation=vertical]/tabs:h-fit", line: "gap-1" } }, defaultVariants: { variant: "default" } }
)

// Radix's data-state is the single selection source, including controlled and keyboard changes.
// This adapter measures layout only; CSS owns the one sliding transition.
function useSelectionGeometry(host: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [rect, setRect] = React.useState<React.CSSProperties>();
  React.useLayoutEffect(() => {
    const list = host.current;
    if (!list || !enabled) { setRect(undefined); return; }
    const measure = () => {
      const active = list.querySelector<HTMLElement>(':scope > [data-slot="tabs-trigger"][data-state="active"]');
      const next = active && active.offsetWidth && active.offsetHeight
        ? { left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight }
        : undefined;
      setRect(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const resize = new ResizeObserver(measure);
    const observe = () => {
      resize.disconnect(); resize.observe(list);
      list.querySelectorAll(':scope > [data-slot="tabs-trigger"]').forEach(item => resize.observe(item));
      measure();
    };
    const mutation = new MutationObserver(observe);
    mutation.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] });
    observe();
    return () => { resize.disconnect(); mutation.disconnect(); };
  }, [host, enabled]);
  return rect;
}

function TabsList({ className, variant = "default", ref: forwardedRef, children, ...props }:
  React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const host = React.useRef<HTMLDivElement>(null);
  const inset = variant === 'default';
  const surfaceRef = useSurface({ appearance: ceramic, props: insetProps, enabled: inset });
  const ref = useComposedRefs(surfaceRef, host, forwardedRef);
  const indicatorRef = useSurface({ appearance: ceramic, props: neutralProps, enabled: inset });
  const rect = useSelectionGeometry(host, inset);
  return (
    <TabsPrimitive.List ref={ref} data-slot="tabs-list" data-variant={variant} data-surface-tabs={inset ? '' : undefined}
      className={cn(tabsListVariants({ variant }), className)} {...props}>
      {inset && <span ref={indicatorRef} aria-hidden="true" data-slot="tabs-indicator"
        className="pointer-events-none absolute rounded-lg motion-safe:transition-[left,top,width,height] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={rect ?? { visibility: 'hidden', width: 0, height: 0 }} />}
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(
    "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "data-[state=active]:text-foreground",
    "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100 group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1 group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5",
    className
  )} {...props} />
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
