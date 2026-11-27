import type { ComponentPropsWithRef } from "react";
import { ceramic, useMaterial } from "@oyn/react";
import { useHostRef } from "./use-selection-track";

/** One raised surface behind the SDK panels, independent of their presence. */
export function TabsPanels({ ref, ...props }: ComponentPropsWithRef<"div">) {
  const surface = useMaterial({ material: ceramic, props: {} });
  return (
    <div {...props} ref={useHostRef(surface, ref)} data-oyn-tab-panels="" />
  );
}
