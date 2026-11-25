import type { Engine } from "./engine.js";
import type { Mesh } from "./types/scene.js";
import type { Material, MaterialInstance } from "./types/material.js";

export type SurfaceOptions<P> = {
  material: Material<P>;
  props: NoInfer<P>;
};

/** Side-effect-free handle. Core owns every host's instance and binding lifetime. */
export function createSurface<P>(
  engine: Engine,
  { material, props }: SurfaceOptions<P>,
) {
  let configuration = props;
  const active = new Map<
    HTMLElement,
    { mesh: Mesh; instance: MaterialInstance<P> }
  >();
  return {
    bind(element: HTMLElement | null) {
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
      let instance: MaterialInstance<P>;
      try {
        instance = material.create(configuration);
      } catch (error) {
        engine.fail(error);
        return;
      }
      const mesh: Mesh = { element, material: instance, dispose };
      active.set(element, { mesh, instance });
      engine.entries.set(element, mesh);
      engine.requestMeasure();
      function dispose() {
        if (active.get(element!)?.mesh !== mesh) return;
        active.delete(element!);
        if (engine.entries.get(element!) === mesh)
          engine.entries.delete(element!);
        engine.release(mesh);
        try {
          instance.dispose?.();
        } catch (error) {
          engine.fail(error);
        }
        engine.requestMeasure();
      }
      return dispose;
    },
    update(next: P) {
      configuration = next;
      if (engine.failed) return;
      try {
        for (const { instance } of active.values()) {
          const change = instance.update?.(next);
          if (change === "layout") engine.requestMeasure();
          else if (change === "draw") engine.requestDraw();
        }
      } catch (error) {
        engine.fail(error);
      }
    },
  };
}
