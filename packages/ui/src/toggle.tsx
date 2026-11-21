"use client";

import "./styles/base.css";
import "./styles/toggle.css";
import * as Parts from "@ui-sdk/react/toggle";
import { renderElement } from "@ui-sdk/react/primitive";
import { useCeramicControl } from "./ceramic-control.js";
import type { ComponentProps } from "react";

export * from "@ui-sdk/react/toggle";

type Props = ComponentProps<typeof Parts.Toggle>;

// The SDK resolves the state and forwards its handlers to the same button.
// Sinking the selected key keeps pressed and unpressed distinct in both themes.
function ToggleFace({
  attrs,
  state,
  render,
}: {
  attrs: Record<string, any>;
  state: Parts.ToggleState;
  render: Props["render"];
}) {
  const face = useCeramicControl(state.pressed ? -3.2 : 8, attrs.ref);
  return renderElement(
    "button",
    { ...attrs, ...("data-oyn-face" in attrs ? undefined : face) },
    render,
    state,
  );
}
export function Toggle({ render, ...props }: Props) {
  return (
    <Parts.Toggle
      {...props}
      render={(attrs, state) => (
        <ToggleFace attrs={attrs} state={state} render={render} />
      )}
    />
  );
}
