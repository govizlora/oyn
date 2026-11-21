"use client";

import "./styles/base.css";
import "./styles/navigation-menu.css";
import type { ComponentProps } from "react";
import { useCeramicControl } from "./ceramic-control.js";
import * as Parts from "@ui-sdk/react/navigation-menu";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/navigation-menu";
export const NavigationMenuList: typeof Parts.NavigationMenuList = ceramicPart(
  Parts.NavigationMenuList,
  "panel",
);
export const NavigationMenuViewport: typeof Parts.NavigationMenuViewport =
  ceramicPart(Parts.NavigationMenuViewport, "panel", "popup");

export const NavigationMenuTrigger: typeof Parts.NavigationMenuTrigger =
  ceramicPart(Parts.NavigationMenuTrigger, "outline");

export function NavigationMenuLink(
  props: ComponentProps<typeof Parts.NavigationMenuLink>,
) {
  const binding = useCeramicControl(props.current ? 5 : null, props.ref);
  return (
    <Parts.NavigationMenuLink
      {...props}
      {...("data-oyn-face" in props ? undefined : binding)}
    />
  );
}

/** A native disclosure for groups of page links in a navigation rail. */
export function NavigationDisclosure({
  ref,
  ...props
}: ComponentProps<"summary">) {
  const binding = useCeramicControl(null, ref);
  return <summary {...props} {...binding} />;
}
