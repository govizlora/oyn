"use client";

import type { ComponentPropsWithRef } from "react";
import { ceramic } from "@oyn/ceramic";
import { useSurface } from "@oyn/surface";
import { useHostRef } from "./use-selection-track.js";

/** One raised surface behind the SDK panels, independent of their presence. */
export function TabsPanels({ ref, ...props }: ComponentPropsWithRef<"div">) {
  const surface = useSurface({ appearance: ceramic, props: {} });
  return (
    <div {...props} ref={useHostRef(surface, ref)} data-oyn-tab-panels="" />
  );
}
