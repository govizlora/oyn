"use client";

import type { ComponentProps } from "react";
import { TabsIndicator, TabsList } from "@ui-sdk/react/tabs";
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
}: ComponentProps<typeof TabsList> & CeramicTabsAppearance) {
  const { list, indicator } = useCeramicTabs({
    radius,
    selectedTone,
    ref,
    style,
  });
  return (
    <TabsList {...props} {...list}>
      {(state) => (
        <>
          <TabsIndicator {...indicator} />
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </TabsList>
  );
}
