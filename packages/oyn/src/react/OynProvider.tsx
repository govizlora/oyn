import { useEffect, useState, type ReactNode } from "react";
import type { SurfaceInputs } from "../core/types/input.js";
import { createEngine } from "../core/engine.js";
import { OynContext } from "./OynContext.js";

export function OynProvider({
  children,
  hdr = false,
  inputs,
}: {
  children: ReactNode;
  hdr?: boolean;
  inputs?: SurfaceInputs;
}) {
  const [engine] = useState(createEngine);

  useEffect(() => {
    const range = hdr ? matchMedia("(dynamic-range: high)") : null;
    const start = () => engine.start(range?.matches ?? false, inputs);
    const changed = () => {
      engine.stop();
      start();
    };
    start();
    range?.addEventListener("change", changed);
    return () => {
      range?.removeEventListener("change", changed);
      engine.stop();
    };
  }, [engine, hdr, inputs]);

  return <OynContext value={engine}>{children}</OynContext>;
}
