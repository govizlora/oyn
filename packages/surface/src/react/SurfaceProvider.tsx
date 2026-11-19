import { useEffect, useState, type ReactNode } from "react";
import { createEngine } from "../engine.js";
import { SurfaceEngineContext } from "./SurfaceEngineContext.js";

export function SurfaceProvider({
  children,
  hdr = false,
}: {
  children: ReactNode;
  hdr?: boolean;
}) {
  const [engine] = useState(createEngine);

  useEffect(() => {
    const range = hdr ? matchMedia("(dynamic-range: high)") : null;
    const start = () => engine.start(range?.matches ?? false);
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
  }, [engine, hdr]);

  return <SurfaceEngineContext value={engine}>{children}</SurfaceEngineContext>;
}
