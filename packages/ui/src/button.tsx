"use client";

import type { ComponentProps } from "react";
import { Button as Action } from "@ui-sdk/react/button";
import { useCeramicControl } from "./ceramic-control.js";
import "./styles/base.css";
import "./styles/button.css";

export * from "@ui-sdk/react/button";
const restElevation = 8;
const hoverOffsets = { lower: -6, lift: 16 } as const;

export function Button({
  hoverEffect,
  ...props
}: ComponentProps<typeof Action> & {
  hoverEffect?: keyof typeof hoverOffsets;
}) {
  const pressed = props["aria-pressed"];
  const face = useCeramicControl(
    pressed === true || pressed === "true" ? -3.2 : restElevation,
    props.ref,
    {
      hoverOffset: hoverEffect && hoverOffsets[hoverEffect],
      maxElevation: restElevation + hoverOffsets.lift,
    },
  );
  // A trigger rendering a Button has already bound its material to this host.
  return (
    <Action
      {...props}
      {...("data-oyn-face" in props
        ? undefined
        : { ...face, "data-oyn-hover-effect": hoverEffect })}
    />
  );
}
