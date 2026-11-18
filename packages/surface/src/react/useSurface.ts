import { useContext, useLayoutEffect, useMemo } from "react";
import type { Mesh } from "../types/scene.js";
import type { Appearance, AppearanceInstance } from "../types/appearance.js";
import { SurfaceEngineContext } from "./SurfaceEngineContext.js";

export type SurfaceOptions<P> = {
  appearance: Appearance<P>;
  props: NoInfer<P>;
};

/** Ref owns the binding; the layout effect supplies committed configuration. */
export function useSurface<P, T extends HTMLElement = HTMLElement>({
  appearance,
  props,
}: SurfaceOptions<P>) {
  const engine = useContext(SurfaceEngineContext);
  if (!engine) throw new Error("useSurface requires SurfaceProvider");

  // Only allocate a handle during render. Instances are created by the ref.
  const binding = useMemo(() => {
    let configuration = props;
    let active: { mesh: Mesh; instance: AppearanceInstance<P> } | undefined;

    return {
      ref(element: T | null) {
        if (!element || engine.failed) return;
        let instance: AppearanceInstance<P>;
        try {
          instance = appearance.create(configuration);
        } catch (error) {
          engine.fail(error);
          return;
        }
        const mesh: Mesh = { element, material: instance.material };
        active = { mesh, instance };
        engine.entries.set(element, mesh);
        engine.requestMeasure();

        return () => {
          if (engine.entries.get(element) === mesh)
            engine.entries.delete(element);
          if (active?.mesh === mesh) active = undefined;
          engine.release(mesh);
          try {
            instance.dispose?.();
          } catch (error) {
            engine.fail(error);
          }
          engine.requestMeasure();
        };
      },
      configure(next: P) {
        configuration = next;
        if (!active || engine.failed) return;
        const { mesh, instance } = active;
        try {
          const update = instance.update(next);
          const previous = mesh.material;
          mesh.material = instance.material;
          if (previous !== mesh.material || update === "layout")
            engine.requestMeasure();
          else if (update === "draw") engine.requestDraw();
        } catch (error) {
          engine.fail(error);
        }
      },
    };
  }, [appearance, engine]);

  useLayoutEffect(() => binding.configure(props));
  return binding.ref;
}
