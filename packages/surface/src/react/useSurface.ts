import { useContext, useLayoutEffect, useMemo } from "react";
import type { Mesh } from "../types/scene.js";
import type { Appearance, AppearanceInstance } from "../types/appearance.js";
import { SurfaceContext } from "./SurfaceContext.js";

export type SurfaceOptions<P> = {
  appearance: Appearance<P>;
  props: NoInfer<P>;
};

/** Ref owns the binding; the layout effect supplies committed configuration. */
export function useSurface<P, T extends HTMLElement = HTMLElement>({
  appearance,
  props,
}: SurfaceOptions<P>) {
  const service = useContext(SurfaceContext);
  if (!service) throw new Error("useSurface requires SurfaceProvider");

  // Only allocate a handle during render. Instances are created by the ref.
  const binding = useMemo(() => {
    let configuration = props;
    let active: { mesh: Mesh; instance: AppearanceInstance<P> } | undefined;

    return {
      ref(element: T | null) {
        if (!element) return;
        let instance: AppearanceInstance<P>;
        try {
          instance = appearance.create(configuration);
        } catch (error) {
          service.report(error);
          return;
        }
        const mesh: Mesh = { element, material: instance.material };
        active = { mesh, instance };
        service.entries.set(element, mesh);
        service.invalidate();

        return () => {
          if (service.entries.get(element) === mesh)
            service.entries.delete(element);
          if (active?.mesh === mesh) active = undefined;
          service.release(mesh);
          try {
            instance.dispose?.();
          } catch (error) {
            service.report(error);
          }
          service.invalidate();
        };
      },
      configure(next: P) {
        configuration = next;
        if (!active) return;
        const { mesh, instance } = active;
        try {
          const update = instance.update(next);
          const previous = mesh.material;
          mesh.material = instance.material;
          if (previous !== mesh.material || update === "layout")
            service.invalidate();
          else if (update === "draw") service.requestDraw();
        } catch (error) {
          service.report(error);
        }
      },
    };
  }, [appearance, service]);

  useLayoutEffect(() => binding.configure(props));
  return binding.ref;
}
