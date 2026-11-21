"use client";

import type { ComponentProps } from "react";
import { Tabs } from "@base-ui/react/tabs";
import {
  useCeramicTabs,
  type CeramicTabsAppearance,
} from "./use-ceramic-tabs.js";

export function CeramicTabsList({
  radius,
  selectedTone,
  ref,
  children,
  style,
  ...props
}: ComponentProps<typeof Tabs.List> & CeramicTabsAppearance) {
  const { list, indicator } = useCeramicTabs({
    radius,
    selectedTone,
    ref,
    style,
  });
  return (
    <Tabs.List {...props} {...list}>
      <Tabs.Indicator {...indicator} />
      {children}
    </Tabs.List>
  );
}
