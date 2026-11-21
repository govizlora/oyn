"use client";

import type { ComponentProps } from "react";
import { useCeramicFace } from "./ceramic-part.js";
import "./styles/base.css";

export function CeramicCard({ ref, ...props }: ComponentProps<"div">) {
  const binding = useCeramicFace("panel", ref);
  return <div data-slot="card" {...props} {...binding} />;
}
