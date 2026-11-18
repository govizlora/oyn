import { createInputs } from "./createInputs.js";
import type { Mesh } from "./types/scene.js";
import type { Material, Parameters, SurfaceBinding } from "./types/material.js";
import { createRenderer, type Renderer, type Target } from "./renderer.js";
import { createPresentation } from "./presentation.js";

type Entry = {
  mesh: Mesh;
  material: Material;
  presentation: ReturnType<typeof createPresentation>;
  target: Target;
  unsubscribe: () => void;
  parameters: Parameters;
  binding?: SurfaceBinding;
  controller: AbortController;
  binder: Material["bind"];
};
export type Engine = ReturnType<typeof createEngine>;

/** Stable instance; browser resources belong to each start/stop cycle. */
export function createEngine() {
  const entries = new Map<HTMLElement, Mesh>();
  let running: ReturnType<typeof startEngine> | undefined;
  let failed = false;
  const engine = {
    entries,
    get failed() {
      return failed;
    },
    fail(error: unknown) {
      if (failed) return;
      failed = true;
      engine.stop();
      console.error(error);
    },
    start() {
      if (running || failed) return;
      try {
        running = startEngine(entries, engine.fail);
      } catch (error) {
        engine.fail(error);
      }
    },
    stop() {
      const current = running;
      running = undefined;
      current?.dispose();
    },
    requestMeasure() {
      running?.requestMeasure();
    },
    requestDraw() {
      running?.requestDraw();
    },
    release(mesh: Mesh) {
      running?.release(mesh);
    },
  };
  return engine;
}

/** Sole scheduling owner. Parameter notifications never invalidate layout. */
function startEngine(
  meshes: Map<HTMLElement, Mesh>,
  fail: (error: unknown) => void,
) {
  let renderer: Renderer | undefined,
    disposed = false,
    raf = 0,
    layoutDirty = true,
    positionDirty = true;
  const input = createInputs(window);
  const entries = new Map<HTMLElement, Entry>();
  function invalidate() {
    if (!disposed && renderer && !raf) raf = requestAnimationFrame(draw);
  }
  function invalidateLayout() {
    layoutDirty = true;
    positionDirty = true;
    invalidate();
  }
  function invalidatePosition() {
    positionDirty = true;
    invalidate();
  }
  function drop(entry: Entry) {
    entry.presentation.dispose();
    const binding = entry.binding;
    entry.binding = undefined;
    try {
      entry.controller.abort();
      binding?.dispose?.();
    } finally {
      entry.unsubscribe();
      resize.unobserve(entry.mesh.element);
      renderer?.release(entry.target);
    }
  }
  function release(mesh: Mesh) {
    const entry = entries.get(mesh.element);
    if (entry?.mesh !== mesh) return;
    entries.delete(mesh.element);
    try {
      drop(entry);
    } catch (error) {
      fail(error);
    }
  }
  function draw() {
    raf = 0;
    if (disposed || !renderer) return;
    try {
      for (const [element, entry] of entries) {
        if (meshes.get(element) !== entry.mesh || !element.isConnected) {
          entries.delete(element);
          drop(entry);
        }
      }
      for (const [element, mesh] of meshes) {
        if (!element.isConnected) continue;
        let entry = entries.get(element);
        if (!entry) {
          const controller = new AbortController();
          let binding: SurfaceBinding | undefined;
          let presentation: ReturnType<typeof createPresentation> | undefined;
          let target: Target | undefined;
          try {
            binding = mesh.material.bind?.({
              element,
              signal: controller.signal,
              inputs: input.inputs,
              requestDraw: invalidatePosition,
              requestMeasure: invalidateLayout,
            });
            binding?.measure?.();
            const material = binding?.material ?? mesh.material;
            presentation = createPresentation({
              element,
              get material() {
                const current = entries.get(element);
                return current
                  ? (current.binding?.material ?? mesh.material)
                  : (binding?.material ?? mesh.material);
              },
            });
            presentation.measure(renderer.limit);
            target = renderer.createTarget(presentation.canvas, material);
            entry = {
              controller,
              binding,
              binder: mesh.material.bind,
              mesh,
              material,
              presentation,
              target,
              parameters: material.parameters,
              unsubscribe: material.parameters.subscribe(invalidate),
            };
            entries.set(element, entry);
            resize.observe(element);
          } catch (error) {
            presentation?.dispose();
            controller.abort();
            binding?.dispose?.();
            if (target) renderer.release(target);
            throw error;
          }
        } else {
          let rebound = false;
          if (entry.binder !== mesh.material.bind) {
            entry.controller.abort();
            entry.binding?.dispose?.();
            entry.binding = undefined;
            entry.controller = new AbortController();
            entry.binder = mesh.material.bind;
            entry.binding = mesh.material.bind?.({
              element,
              signal: entry.controller.signal,
              inputs: input.inputs,
              requestDraw: invalidatePosition,
              requestMeasure: invalidateLayout,
            });
            rebound = true;
          }
          if (layoutDirty || rebound) entry.binding?.measure?.();
          const material = entry.binding?.material ?? mesh.material;
          const replaced =
            entry.material !== material ||
            entry.parameters !== material.parameters;
          if (replaced) {
            entry.unsubscribe();
            if (entry.target.size !== material.parameters.length * 4) {
              renderer.release(entry.target);
              entry.target = renderer.createTarget(
                entry.presentation.canvas,
                material,
              );
            }
            entry.material = material;
            entry.parameters = material.parameters;
            entry.unsubscribe = material.parameters.subscribe(invalidate);
          }
          if (layoutDirty || rebound || replaced)
            entry.presentation.measure(renderer.limit);
        }
      }
      layoutDirty = false;
      mutations.takeRecords();
      const items = [];
      for (const entry of entries.values()) {
        const frame = entry.presentation.frame(entry.binding, positionDirty);
        if (frame)
          items.push({ target: entry.target, material: entry.material, frame });
      }
      positionDirty = false;
      renderer.draw(items);
    } catch (error) {
      fail(error);
    }
  }
  const resize = new ResizeObserver(invalidateLayout);
  const mutations = new MutationObserver(invalidateLayout);
  mutations.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "class", "open", "hidden"],
  });
  window.addEventListener("scroll", invalidatePosition, true);
  window.addEventListener("resize", invalidateLayout);
  window.addEventListener("transitionend", invalidateLayout, true);
  window.addEventListener("animationend", invalidateLayout, true);
  // A DPR-only change need not emit an element resize.
  let resolution: MediaQueryList;
  function watchResolution() {
    resolution?.removeEventListener("change", resolutionChanged);
    resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    resolution.addEventListener("change", resolutionChanged);
  }
  function resolutionChanged() {
    watchResolution();
    invalidateLayout();
  }
  watchResolution();
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    mutations.disconnect();
    resize.disconnect();
    window.removeEventListener("scroll", invalidatePosition, true);
    window.removeEventListener("resize", invalidateLayout);
    window.removeEventListener("transitionend", invalidateLayout, true);
    window.removeEventListener("animationend", invalidateLayout, true);
    resolution.removeEventListener("change", resolutionChanged);
    const errors: unknown[] = [];
    entries.forEach((entry) => {
      try {
        drop(entry);
      } catch (error) {
        errors.push(error);
      }
    });
    entries.clear();
    input.dispose();
    renderer?.dispose();
    errors.forEach((error) => console.error(error));
  }
  const failed = (error: unknown) => {
    if (!disposed) fail(error);
  };
  void createRenderer(failed)
    .then((value) => {
      if (disposed) {
        value.dispose();
        return;
      }
      renderer = value;
      invalidate();
    })
    .catch(failed);
  return {
    requestMeasure: invalidateLayout,
    requestDraw: invalidate,
    release,
    dispose,
  };
}
