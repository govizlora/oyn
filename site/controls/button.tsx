import type { ComponentProps } from "react";
import { Button as Action } from "@ui-sdk/react/button";
import { useCeramicControl } from "./ceramic-control.js";

export * from "@ui-sdk/react/button";
const raised = 8;
const lift = 16;

export function Button({
  variant = "primary",
  ...props
}: ComponentProps<typeof Action> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const pressed = props["aria-pressed"];
  const ghost = variant === "ghost";
  const selected = pressed === true || pressed === "true";
  const rest = ghost ? (selected ? -3.2 : null) : selected ? 4 : raised;
  const face = useCeramicControl(rest, props.ref, {
    hoverOffset: ghost ? undefined : lift,
    pressElevation: ghost ? -8 : 2,
    // A mounted ghost can switch to a raised variant without rebinding.
    maxElevation: raised + lift,
  });
  // A trigger rendering a Button has already bound its material to this host.
  return (
    <Action
      {...props}
      {...("data-oyn-face" in props
        ? undefined
        : { ...face, "data-oyn-button": variant })}
    />
  );
}
