"use client";

import "./styles/base.css";
import "./styles/avatar.css";
import * as Parts from "@ui-sdk/react/avatar";
import { useCeramicControl } from "./ceramic-control.js";
import type { ComponentProps } from "react";

export * from "@ui-sdk/react/avatar";
export function Avatar(props: ComponentProps<typeof Parts.Avatar>) {
  const binding = useCeramicControl(-3.2, props.ref);
  return (
    <Parts.Avatar
      {...props}
      {...("data-oyn-face" in props ? undefined : binding)}
    />
  );
}
