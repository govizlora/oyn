"use client";

import type { ComponentProps } from "react";
import { Button as Action } from "@ui-sdk/react/button";
import { useCeramicControl } from "./ceramic-control.js";
import "./styles/base.css";
import "./styles/button.css";

export * from "@ui-sdk/react/button";
export function Button(props: ComponentProps<typeof Action>) {
  const pressed = props["aria-pressed"];
  const face = useCeramicControl(
    pressed === true || pressed === "true" ? -3.2 : 8,
    props.ref,
  );
  // A trigger rendering a Button has already bound its material to this host.
  return (
    <Action {...props} {...("data-oyn-face" in props ? undefined : face)} />
  );
}
