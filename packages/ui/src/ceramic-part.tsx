"use client";

import {
  createContext,
  createElement,
  useContext,
  type ComponentType,
  type ComponentProps,
  type Ref,
} from "react";
import { mergeProps } from "@ui-sdk/react/primitive";
import { useCeramicControl } from "./ceramic-control.js";
import { ceramic } from "oyn/materials/ceramic";
import { useMaterial } from "oyn/react";
import "./styles/material.css";

// Compound fields have one well around the input and its adornments.
const FieldWell = createContext(false);
const elevations = {
  key: 8,
  panel: 12,
  floating: 72,
  thumb: 6,
  well: -3.2,
} as const;
type Face = keyof typeof elevations;

export function useCeramicFace(face: Face, ref?: Ref<HTMLElement>) {
  const surface = useMaterial({
    appearance: ceramic,
    props:
      face === "floating"
        ? {
            elevation: elevations.floating,
            shadowStrength: 0.24,
            contactShadowStrength: 0.06,
          }
        : { elevation: elevations[face] },
  });
  return { ...mergeProps({ ref: surface }, { ref }), "data-oyn-face": face };
}

type HostProps = {
  ref?: Ref<HTMLElement>;
  render?: unknown;
  "data-oyn-face"?: Face;
};

// Every SDK part keeps its own props, including generic values, polymorphic
// render targets and render functions. Only its DOM presentation changes.
export function ceramicPart<Part extends ComponentType<any>>(
  Part: Part,
  face: Face | "outline",
  placement?: "field" | "group" | "popup",
): Part {
  if (face === "outline" || face === "key") {
    const rest = face === "key" ? elevations.key : null;
    function ControlPart(props: ComponentProps<Part> & HostProps) {
      const binding = useCeramicControl(rest, props.ref);
      return createElement(
        Part,
        props["data-oyn-face"] ? props : { ...props, ...binding },
      );
    }
    return ControlPart as Part;
  }
  const fixedFace = face;
  function MaterialPart(props: ComponentProps<Part> & HostProps) {
    const inGroup = useContext(FieldWell);
    const binding = useCeramicFace(
      fixedFace,
      placement === "field" ? undefined : props.ref,
    );
    // A composed trigger can render another Ceramic part on the same host.
    if (props["data-oyn-face"]) return createElement(Part, props);
    if (placement === "field") {
      const control = createElement(Part, props);
      if (inGroup) return control;
      return (
        <FieldWell value={true}>
          <span data-oyn-input-frame="" {...binding}>
            {control}
          </span>
        </FieldWell>
      );
    }
    const control = createElement(Part, {
      ...props,
      ...binding,
      ...(placement === "popup" ? { "data-oyn-popup": "" } : {}),
    });
    return placement === "group" ? (
      <FieldWell value={true}>{control}</FieldWell>
    ) : (
      control
    );
  }
  return MaterialPart as Part;
}
