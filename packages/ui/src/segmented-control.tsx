"use client";
import type { ComponentProps } from "react";
import * as SDK from "@ui-sdk/react/segmented-control";
import {
  useSelectionTrack,
  type TrackAppearance,
} from "./use-selection-track.js";

export {
  SegmentedControlItem,
  createSegmentedControlController,
} from "@ui-sdk/react/segmented-control";
export function SegmentedControl<T extends string = string>({
  radius,
  ref,
  style,
  children,
  ...props
}: ComponentProps<typeof SDK.SegmentedControl<T>> & TrackAppearance) {
  const { list, indicator } = useSelectionTrack({
    radius,
    ref,
    style,
  });
  return (
    <SDK.SegmentedControl<T> {...props} {...list}>
      {(state) => (
        <>
          <SDK.SegmentedControlIndicator {...indicator} />
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </SDK.SegmentedControl>
  );
}
