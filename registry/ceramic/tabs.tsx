"use client";

import type { ComponentProps, ComponentPropsWithRef } from "react";
import { TabsIndicator, TabsList as List } from "@ui-sdk/react/tabs";
import {
  useSelectionTrack,
  useHostRef,
  type TrackAppearance,
} from "./use-selection-track";

import { ceramic, useMaterial } from "@oyn/react";

export * from "@ui-sdk/react/tabs";

export function CeramicTabsList({
  radius,
  ref,
  children,
  style,
  ...props
}: ComponentProps<typeof List> & TrackAppearance) {
  const { list, indicator } = useSelectionTrack({
    radius,
    ref,
    style,
  });
  return (
    <List {...props} {...list}>
      {(state) => (
        <>
          <TabsIndicator data-slot="tabs-indicator" {...indicator} />
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </List>
  );
}

export { CeramicTabsList as TabsList };

/** One raised surface behind the SDK panels, independent of their presence. */
export function TabsPanels({ ref, ...props }: ComponentPropsWithRef<"div">) {
  const surface = useMaterial({ material: ceramic, props: {} });
  return (
    <div {...props} ref={useHostRef(surface, ref)} data-oyn-tab-panels="" />
  );
}
