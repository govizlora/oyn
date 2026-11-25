import { useContext, useLayoutEffect, useMemo } from "react";
import { createSurface, type SurfaceOptions } from "../core/surface.js";
import { OynContext } from "./OynContext.js";

export type MaterialOptions<P> = SurfaceOptions<P>;

/** React forwards host lifetime and committed props to the one Core binding path. */
export function useMaterial<P, T extends HTMLElement = HTMLElement>({
  material,
  props,
}: MaterialOptions<P>) {
  const engine = useContext(OynContext);
  if (!engine) throw new Error("useMaterial requires OynProvider");
  const surface = useMemo(
    () => createSurface(engine, { material, props }),
    [material, engine],
  );
  useLayoutEffect(() => surface.update(props));
  return surface.bind as (element: T | null) => void | (() => void);
}
