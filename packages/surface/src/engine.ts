import { createInputs } from "./createInputs.js";
import type { Mesh } from "./types/scene.js";
import type { Material, Parameters, SurfaceBinding } from "./types/material.js";
import { createRenderer, type Renderer, type Target } from "./renderer.js";
import { createPresentation } from "./presentation.js";

type Entry = {
  mesh: Mesh;
  material: Material;
  output?: {
    presentation: ReturnType<typeof createPresentation>;
    target: Target;
  };
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
    start(hdr = false) {
      if (running || failed) return;
      try {
        running = startEngine(entries, engine.fail, hdr);
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

/** Sole GPU draw scheduler. Consumer animation clocks only publish parameters. */
function startEngine(
  meshes: Map<HTMLElement, Mesh>,
  fail: (error: unknown) => void,
  hdr: boolean,
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
  function detach(entry: Entry) {
    if (!entry.output) return;
    entry.output.presentation.dispose();
    renderer?.release(entry.output.target);
    entry.output = undefined;
  }
  function drop(entry: Entry) {
    detach(entry);
    const binding = entry.binding;
    entry.binding = undefined;
    try {
      entry.controller.abort();
      binding?.dispose?.();
    } finally {
      entry.unsubscribe();
      resize.unobserve(entry.mesh.element);
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
        let measure = layoutDirty;
        if (!entry) {
          const controller = new AbortController();
          let binding: SurfaceBinding | undefined;
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
            entry = {
              controller,
              binding,
              binder: mesh.material.bind,
              mesh,
              material,
              parameters: material.parameters,
              unsubscribe: material.parameters.subscribe(invalidate),
            };
            entries.set(element, entry);
            resize.observe(element);
          } catch (error) {
            controller.abort();
            binding?.dispose?.();
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
            entry.material = material;
            entry.parameters = material.parameters;
            entry.unsubscribe = material.parameters.subscribe(invalidate);
          }
          measure ||= rebound || replaced;
        }
        // An empty draw program has a binding, but no presentation/resources.
        // Parameter notifications can make it drawable again through this path.
        if (
          !entry.material.passes.length ||
          (renderer.ready && !renderer.ready(entry.material))
        ) {
          detach(entry);
          continue;
        }
        if (!entry.output) {
          const current = entry;
          const presentation = createPresentation({
            element,
            get material() {
              return current.material;
            },
          });
          try {
            presentation.measure(renderer.limit);
            entry.output = {
              presentation,
              target: renderer.createTarget(
                presentation.canvas,
                entry.material,
              ),
            };
          } catch (error) {
            presentation.dispose();
            throw error;
          }
        } else if (measure) entry.output.presentation.measure(renderer.limit);
      }
      layoutDirty = false;
      mutations.takeRecords();
      const items = [];
      for (const entry of entries.values()) {
        if (!entry.output) continue;
        const { target, presentation } = entry.output;
        const frame = presentation.frame(entry.binding, positionDirty);
        if (frame)
          items.push({ target, material: entry.material, frame, presentation });
      }
      positionDirty = false;
      renderer.draw(items);
      for (const item of items) item.presentation.activate();
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
  void createRenderer(failed, invalidate, hdr)
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
