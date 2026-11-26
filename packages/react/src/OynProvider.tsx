import { useEffect, useState, type ReactNode } from "react";
import type { SurfaceInputs } from "@oyn/core";
import { createEngine } from "@oyn/core";
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
    engine.start(hdr, inputs);
    return () => engine.stop();
  }, [engine, hdr, inputs]);

  return <OynContext value={engine}>{children}</OynContext>;
}
