import type { Mesh } from './scene.js';
import type { Material } from './material.js';
import { createRenderer, type Renderer, type Target } from './renderer.js';
import { createPresentation } from './presentation.js';

type Entry = { mesh: Mesh; material: Material; presentation: ReturnType<typeof createPresentation>; target: Target; unsubscribe: () => void };
/** Sole scheduling owner. Parameter notifications never invalidate layout. */
export function createEngine(meshes: Map<HTMLElement, Mesh>, report: (error: unknown) => void = console.error) {
  let renderer: Renderer | undefined, disposed = false, raf = 0, layoutDirty = true, positionDirty = true;
  let pointer = { x: 100, y: 100 };
  const entries = new Map<HTMLElement, Entry>();
  function invalidate() { if (!disposed && renderer && !raf) raf = requestAnimationFrame(draw); }
  function invalidateLayout() { layoutDirty = true; positionDirty = true; invalidate(); }
  function invalidatePosition() { positionDirty = true; invalidate(); }
  function drop(entry: Entry) { entry.unsubscribe(); resize.unobserve(entry.mesh.element); renderer?.release(entry.target); entry.presentation.dispose(); }
  function fail(error: unknown) { if (disposed) return; dispose(); report(error); }
  function draw() {
    raf = 0;
    if (disposed || !renderer) return;
    try {
      for (const [element, entry] of entries) {
        if (meshes.get(element) !== entry.mesh || !element.isConnected) { drop(entry); entries.delete(element); }
      }
      for (const [element, mesh] of meshes) {
        if (!element.isConnected) continue;
        let entry = entries.get(element);
        if (!entry) {
          const presentation = createPresentation(mesh);
          try {
            presentation.measure(renderer.limit);
            const target = renderer.createTarget(presentation.canvas, mesh.material);
            entry = { mesh, material: mesh.material, presentation, target, unsubscribe: mesh.material.parameters.subscribe(invalidate) };
            entries.set(element, entry); resize.observe(element);
          } catch (error) { presentation.dispose(); throw error; }
        } else if (entry.material !== mesh.material) {
          entry.unsubscribe();
          if (entry.target.size !== mesh.material.parameters.length * 4) {
            renderer.release(entry.target);
            entry.target = renderer.createTarget(entry.presentation.canvas, mesh.material);
          }
          entry.material = mesh.material;
          entry.unsubscribe = mesh.material.parameters.subscribe(invalidate);
        }
        if (layoutDirty) entry.presentation.measure(renderer.limit);
      }
      layoutDirty = false;
      mutations.takeRecords();
      const items = [];
      for (const entry of entries.values()) {
        const frame = entry.presentation.frame(pointer, positionDirty);
        if (frame) items.push({ target: entry.target, material: entry.material, frame });
      }
      positionDirty = false;
      renderer.draw(items);
    } catch (error) { fail(error); }
  }
  const resize = new ResizeObserver(invalidateLayout);
  const mutations = new MutationObserver(invalidateLayout);
  mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'open', 'hidden'] });
  function move(event: PointerEvent) { pointer = { x: event.clientX, y: event.clientY }; invalidatePosition(); }
  window.addEventListener('pointermove', move);
  window.addEventListener('scroll', invalidatePosition, true);
  window.addEventListener('resize', invalidateLayout);
  window.addEventListener('transitionend', invalidateLayout, true);
  window.addEventListener('animationend', invalidateLayout, true);
  // A DPR-only change need not emit an element resize.
  let resolution: MediaQueryList;
  function watchResolution() {
    resolution?.removeEventListener('change', resolutionChanged);
    resolution = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    resolution.addEventListener('change', resolutionChanged);
  }
  function resolutionChanged() { watchResolution(); invalidateLayout(); }
  watchResolution();
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf);
    mutations.disconnect(); resize.disconnect();
    window.removeEventListener('pointermove', move); window.removeEventListener('scroll', invalidatePosition, true);
    window.removeEventListener('resize', invalidateLayout);
    window.removeEventListener('transitionend', invalidateLayout, true); window.removeEventListener('animationend', invalidateLayout, true);
    resolution.removeEventListener('change', resolutionChanged);
    entries.forEach(drop); entries.clear(); renderer?.dispose();
  }
  void createRenderer(fail).then(value => {
    if (disposed) { value.dispose(); return; }
    renderer = value; invalidate();
  }).catch(fail);
  return { invalidate: invalidateLayout, dispose };
}
