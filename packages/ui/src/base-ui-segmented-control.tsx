"use client";
import { useCallback } from "react";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import {
  useSelectionTrack,
  type TrackAppearance,
} from "./use-selection-track.js";

export const SegmentedControlItem = Radio.Root;
export function SegmentedControl<T>({
  radius,
  ref,
  style,
  orientation = "horizontal",
  children,
  ...props
}: RadioGroup.Props<T> &
  TrackAppearance & { orientation?: "horizontal" | "vertical" }) {
  const { list, indicator } = useSelectionTrack({
    radius,
    ref,
    style,
  });
  // RadioGroup has no moving indicator. Read its checked DOM item for layout
  // only; do not mirror its value, intercept its keys or dispatch changes.
  const place = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return;
      const detach = indicator.ref(node);
      const group = node.parentElement!;
      const measure = () => {
        const item = group.querySelector<HTMLElement>(
          ":scope > [role=radio][aria-checked=true]",
        );
        node.hidden = !item;
        if (!item) return;
        for (const [edge, value] of [
          ["left", item.offsetLeft],
          ["top", item.offsetTop],
          ["width", item.offsetWidth],
          ["height", item.offsetHeight],
        ] as const)
          node.style.setProperty("--oyn-indicator-" + edge, value + "px");
      };
      const sizes = new ResizeObserver(measure);
      function observeItems() {
        sizes.disconnect();
        sizes.observe(group);
        for (const item of group.querySelectorAll(":scope > [role=radio]"))
          sizes.observe(item);
        measure();
      }
      const changes = new MutationObserver((records) => {
        if (records.some((r) => r.type === "childList" && r.target === group))
          observeItems();
        else measure();
      });
      changes.observe(group, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-checked", "dir", "data-orientation"],
      });
      observeItems();
      return () => {
        changes.disconnect();
        sizes.disconnect();
        detach?.();
      };
    },
    [indicator.ref],
  );
  return (
    <RadioGroup<T>
      aria-orientation={orientation}
      data-orientation={orientation}
      {...props}
      {...list}
    >
      <span {...indicator} ref={place} />
      {children}
    </RadioGroup>
  );
}
