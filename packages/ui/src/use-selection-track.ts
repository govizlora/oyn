"use client";

import { useCallback, type CSSProperties, type Ref } from "react";
import { ceramic, createCeramicMaterial } from "oyn/materials/ceramic";
import { type Appearance, type Material, type SurfaceBindingContext } from "oyn";
import { useMaterial } from "oyn/react";
import { bindAnimatedElevation } from "./animated-elevation.js";
import "./selection-track.css";

export type TrackAppearance = {
  radius?: number;
};

// At rest the underlying track shows through. Only the animated relief is drawn.
const hoverWell: Appearance<{}> = {
  create() {
    const source = createCeramicMaterial({
      elevation: 0,
      color: "transparent",
    });
    const material: Material = Object.create(source, {
      bind: {
        value(context: SurfaceBindingContext) {
          const { motion, binding } = bindAnimatedElevation(
            source,
            context,
            0,
            () => true,
          );
          const { element, signal } = context;
          const view = element.ownerDocument.defaultView!;
          const leave = () => motion.setTarget(0);
          element.addEventListener(
            "pointerenter",
            (event) => {
              if (event.pointerType !== "touch") motion.setTarget(-4);
            },
            { signal },
          );
          element.addEventListener("pointerleave", leave, { signal });
          element.addEventListener("pointercancel", leave, { signal });
          view.addEventListener("blur", leave, { signal });
          if (
            view.matchMedia("(hover: hover)").matches &&
            element.matches(":hover")
          )
            motion.setTarget(-4);
          return binding;
        },
      },
    });
    return { material, update() {} };
  },
};

export function useSelectionTrack<State>({
  radius = 12,
  ref,
  style,
}: TrackAppearance & {
  ref?: Ref<HTMLDivElement>;
  style?: CSSProperties | ((state: State) => CSSProperties | undefined);
}) {
  const track = useMaterial({ appearance: ceramic, props: { elevation: -3.2 } });
  const thumb = useMaterial({
    appearance: ceramic,
    props: {},
  });
  const well = useMaterial({ appearance: hoverWell, props: {} });

  // The SDK owns the items. Keep a binding for each eligible host so hover-out
  // and hover-in can overlap, but release a newly selected host immediately.
  const bindTrack = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const detach = track(node);
      const wells = new Map<HTMLElement, ReturnType<typeof well>>();
      function sync() {
        const items = new Set(
          node!.querySelectorAll<HTMLElement>(
            ":scope > :is([role=tab],[role=radio]):not(:disabled,[aria-disabled=true],[data-disabled],[inert] *,[aria-selected=true],[aria-checked=true],[data-oyn-face])",
          ),
        );
        for (const [item, release] of wells) {
          if (items.has(item)) continue;
          release?.();
          wells.delete(item);
        }
        for (const item of items) {
          if (!wells.has(item)) wells.set(item, well(item));
        }
      }
      const changes = new MutationObserver((records) => {
        if (
          records.some(
            (r) =>
              r.target === node ||
              (r.type === "attributes" &&
                (r.target as Element).parentElement === node),
          )
        )
          sync();
      });
      changes.observe(node, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          "role",
          "aria-selected",
          "aria-checked",
          "disabled",
          "aria-disabled",
          "data-disabled",
          "inert",
          "data-oyn-face",
        ],
      });
      sync();
      return () => {
        changes.disconnect();
        for (const release of wells.values()) release?.();
        detach?.();
      };
    },
    [track, well],
  );
  return {
    list: {
      ref: useHostRef(bindTrack, ref),
      "data-oyn-track": "",
      style: (state: State): CSSProperties =>
        ({
          "--track-radius": radius + "px",
          ...(typeof style === "function" ? style(state) : style),
        }) as CSSProperties,
    },
    indicator: {
      ref: thumb,
      "data-oyn-indicator": "",
      "aria-hidden": true,
    } as const,
  };
}

// Compose target-local binding cleanup with React 19's forwarded ref cleanup.
export function useHostRef<T extends HTMLElement>(
  bind: (node: T | null) => void | (() => void),
  ref?: Ref<T>,
) {
  return useCallback(
    (node: T | null) => {
      if (!node) return;
      const detach = bind(node);
      const cleanup = typeof ref === "function" ? ref(node) : undefined;
      if (ref && typeof ref !== "function") ref.current = node;
      return () => {
        detach?.();
        if (cleanup) cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    },
    [bind, ref],
  );
}
