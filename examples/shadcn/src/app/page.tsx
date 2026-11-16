import { Fragment } from "react"
import { cn } from "@/lib/utils"
import { useAppearance } from "./appearance"
import { AppSidebar } from "@/app/dashboard/app-sidebar"
import { ChartAreaInteractive } from "@/app/dashboard/chart-area-interactive"
import { DataTable } from "@/app/dashboard/data-table"
import { SectionCards } from "@/app/dashboard/section-cards"
import { SiteHeader } from "@/app/dashboard/site-header"
import {
  SidebarProvider,
} from "@/app/ui/sidebar"

import { PanelSurface } from "./ui/panel"

import data from "./data.json"

export default function Page() {
  const { appearance } = useAppearance()
  return (
    <SidebarProvider
      className="relative h-full min-h-0"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {/* Navigation is the receiver, not an overlay above the raised content panel. */}
      <AppSidebar variant="inset" className="absolute z-auto h-full" />
      {/* Paint is outside the scroll viewport, so the card's shadow is not clipped. */}
      <main data-slot="sidebar-inset" className="relative isolate flex min-h-0 min-w-0 w-full flex-1 flex-col md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2">
        <PanelSurface aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit]" />
        {/* Clip native scrollbar chrome, not the sibling material and exterior shadow. */}
        <div data-dashboard-clip className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col rounded-[inherit]", appearance === "ceramic" && "overflow-hidden")}>
          {/* This scroll owner remains mounted when the surface implementation changes. */}
          <div data-dashboard-scroll className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-[inherit]">
            <Fragment key={appearance}>
              <SiteHeader />
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <SectionCards />
                    <div className="px-4 lg:px-6">
                      <ChartAreaInteractive />
                    </div>
                    <DataTable data={data} />
                  </div>
                </div>
              </div>
            </Fragment>
          </div>
        </div>
      </main>
    </SidebarProvider>
  )
}
