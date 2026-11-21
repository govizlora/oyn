"use client";

import { useCallback, type CSSProperties, type Ref } from "react";
import { ceramic } from "@oyn/ceramic";
import { useSurface } from "@oyn/surface";
import "./ceramic-tabs-list.css";

export type CeramicTabsAppearance = {
  radius?: number;
  selectedTone?: "matching" | "inverse";
};

export function useCeramicTabs<State>({
  radius = 12,
  selectedTone = "matching",
  ref,
  style,
}: CeramicTabsAppearance & {
  ref?: Ref<HTMLDivElement>;
  style?: CSSProperties | ((state: State) => CSSProperties | undefined);
}) {
  const track = useSurface({ appearance: ceramic, props: { elevation: -3.2 } });
  const thumb = useSurface({
    appearance: ceramic,
    props: { color: selectedTone === "inverse" ? "inverse" : undefined },
  });

  // React 19 callback refs can return cleanup instead of expecting ref(null).
  const forwardTrack = useCallback(
    (node: HTMLDivElement | null) => {
      const detach = track(node);
      const cleanup = typeof ref === "function" ? ref(node) : undefined;
      if (ref && typeof ref !== "function") ref.current = node;
      return () => {
        detach?.();
        if (cleanup) cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    },
    [track, ref],
  );

  return {
    list: {
      ref: ref ? forwardTrack : track,
      "data-oyn-tabs": "",
      "data-tone": selectedTone,
      style: (state: State): CSSProperties =>
        ({
          "--tabs-radius": radius + "px",
          ...(typeof style === "function" ? style(state) : style),
        }) as CSSProperties,
    },
    indicator: {
      ref: thumb,
      "data-slot": "tabs-indicator",
      "aria-hidden": true,
    },
  };
}
