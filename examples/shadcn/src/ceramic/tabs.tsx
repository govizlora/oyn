"use client"

import { CeramicTabsList as CeramicList } from "@oyn/ui/tabs"
import { Tabs as Root, TabsTab as Trigger, TabsPanel as Content, TabsList as List } from "@ui-sdk/react/tabs"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"


function Tabs({ className, orientation = "horizontal", activationMode, onValueChange, ...props }:
  React.ComponentProps<"div"> & {
    orientation?: "horizontal" | "vertical"
    activationMode?: "automatic" | "manual"
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
  }) {
  return <Root activation={activationMode} onValueChange={onValueChange && (value => { if (value !== null) onValueChange(value) })} data-slot="tabs" data-orientation={orientation} orientation={orientation}
    className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)} {...props} />
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:flex-col",
  { variants: { variant: { default: "h-9 rounded-xl p-1 group-data-[orientation=vertical]/tabs:h-fit", line: "gap-1" } }, defaultVariants: { variant: "default" } }
)

function TabsList({ className, variant = "default", ...props }:
  React.ComponentProps<typeof List> & VariantProps<typeof tabsListVariants>) {
  const Component = variant === "line" ? List : CeramicList;
  return <Component {...props} data-slot="tabs-list" data-variant={variant}
    data-surface-tabs={variant === "line" ? undefined : ""}
    className={cn(tabsListVariants({ variant }), className)} />;
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Trigger>) {
  return <Trigger data-slot="tabs-trigger" className={cn(
    "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "aria-selected:text-foreground",
    "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bg-foreground group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:aria-selected:after:opacity-100 group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-1 group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5",
    className
  )} {...props} />
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof Content>) {
  return <Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
