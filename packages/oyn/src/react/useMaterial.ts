import { useContext, useLayoutEffect, useMemo } from "react";
import type { Mesh } from "../core/types/scene.js";
import type { Appearance, AppearanceInstance } from "../core/types/appearance.js";
import { OynContext } from "./OynContext.js";

export type MaterialOptions<P> = {
  appearance: Appearance<P>;
  props: NoInfer<P>;
};

/** Ref owns the binding; the layout effect supplies committed configuration. */
export function useMaterial<P, T extends HTMLElement = HTMLElement>({
  appearance,
  props,
}: MaterialOptions<P>) {
  const engine = useContext(OynContext);
  if (!engine) throw new Error("useMaterial requires OynProvider");

  // Only allocate a handle during render. Instances are created by the ref.
  const binding = useMemo(() => {
    let configuration = props;
    let active: { mesh: Mesh; instance: AppearanceInstance<P> } | undefined;

    return {
      ref(element: T | null) {
        if (!element || engine.failed) return;
        if (engine.entries.has(element)) {
          engine.fail(
            new Error(
              "Surface target already has an active binding; compose one material owner per element.",
              { cause: element },
            ),
          );
          return;
        }
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
