"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useSurface } from "@oyn/surface";
import { ceramic } from "@oyn/ceramic";
import "./tabs.css";

export { Root as Tabs, Content as TabsContent } from "@radix-ui/react-tabs";

export function TabsList({
  radius = 12,
  selectedTone = "matching",
  ref,
  children,
  style,
  ...props
}: ComponentProps<typeof Tabs.List> & {
  radius?: number;
  selectedTone?: "matching" | "inverse";
}) {
  const host = useRef<HTMLDivElement>(null);
  const track = useSurface({ appearance: ceramic, props: { elevation: -2.3 } });
  const thumb = useSurface({
    appearance: ceramic,
    props: { color: selectedTone === "inverse" ? "inverse" : undefined },
  });
  const listRef = useComposedRefs(ref, host, track);
  const [rect, setRect] = useState<CSSProperties>();

  // Radix owns selection. Only measure its active button; CSS interpolates the rectangle.
  useLayoutEffect(() => {
    const list = host.current!;
    function measure() {
      const active = list.querySelector<HTMLElement>(
        ':scope > [role="tab"][aria-selected="true"]',
      );
      const next =
        active && active.offsetWidth
          ? {
              left: active.offsetLeft,
              top: active.offsetTop,
              width: active.offsetWidth,
              height: active.offsetHeight,
            }
          : undefined;
      setRect((prev) =>
        prev?.left === next?.left &&
        prev?.top === next?.top &&
        prev?.width === next?.width &&
        prev?.height === next?.height
          ? prev
          : next,
      );
    }
    const resize = new ResizeObserver(measure);
    function observeItems() {
      resize.disconnect();
      resize.observe(list);
      list
        .querySelectorAll(':scope > [role="tab"]')
        .forEach((item) => resize.observe(item));
      measure();
    }
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) => record.type === "childList" && record.target === list,
        )
      )
        observeItems();
      else measure();
    });
    observer.observe(list, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected", "data-orientation"],
    });
    observeItems();
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, []);

  return (
    <Tabs.List
      {...props}
      ref={listRef}
      data-oyn-tabs=""
      data-tone={selectedTone}
      style={{ "--tabs-radius": radius + "px", ...style } as CSSProperties}
    >
      {rect && (
        <span
          ref={thumb}
          data-slot="tabs-indicator"
          aria-hidden="true"
          style={rect}
        />
      )}
      {children}
    </Tabs.List>
  );
}

export function TabsTrigger(props: ComponentProps<typeof Tabs.Trigger>) {
  return <Tabs.Trigger {...props} data-slot="tabs-trigger" />;
}
