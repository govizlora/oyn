"use client";

import type { ComponentProps } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  useSelectionTrack,
  type TrackAppearance,
} from "./use-selection-track.js";

export function CeramicTabsList({
  radius,
  ref,
  children,
  style,
  ...props
}: ComponentProps<typeof Tabs.List> & TrackAppearance) {
  const { list, indicator } = useSelectionTrack({
    radius,
    ref,
    style,
  });
  return (
    <Tabs.List {...props} {...list}>
      <Tabs.Indicator data-slot="tabs-indicator" {...indicator} />
      {children}
    </Tabs.List>
  );
}

export { TabsPanels } from "./tabs-panels.js";
