import type { ComponentProps } from "react";
import { TabsIndicator, TabsList } from "@ui-sdk/react/tabs";
import { useSelectionTrack, type TrackAppearance } from "./use-selection-track";

export function CeramicTabsList({
  radius,
  ref,
  children,
  style,
  ...props
}: ComponentProps<typeof TabsList> & TrackAppearance) {
  const { list, indicator } = useSelectionTrack({
    radius,
    ref,
    style,
  });
  return (
    <TabsList {...props} {...list}>
      {(state) => (
        <>
          <TabsIndicator data-slot="tabs-indicator" {...indicator} />
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </TabsList>
  );
}

export { TabsPanels } from "./tabs-panels";
