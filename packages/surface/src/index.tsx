import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { createEngine } from './engine.js';
import { type Mesh } from './scene.js';
import type { SurfaceMode } from './material.js';

export type { Material, Parameters, Insets, SurfaceMode, StaticData, SurfaceBinding, SurfaceBindingContext, SurfaceFrame, FrameExtras } from './material.js';
export { createParameters } from './material.js';
import type { Appearance, AppearanceInstance } from './appearance.js';
export type { Appearance, AppearanceContext, AppearanceInstance, AppearanceUpdate } from './appearance.js';
export type { Point, PointerInput, PointerSnapshot, SurfaceInputs } from './input.js';
export { materialAppearance } from './appearance.js';
export type SurfaceOptions<P> = { appearance: Appearance<P>; props: NoInfer<P>; enabled?: boolean };
type Service = {
  entries: Map<HTMLElement, Mesh>;
  invalidate: () => void;
  requestDraw: () => void;
  release: (mesh: Mesh) => void;
  report: (error: unknown) => void;
};
const ModeContext = createContext<SurfaceMode>('light');
export const useSurfaceMode = () => useContext(ModeContext);

const Context = createContext<Service | null>(null);

export function SurfaceProvider({ children, mode = 'system', onError = console.error }: { children: ReactNode; mode?: SurfaceMode | 'system'; onError?: (error: unknown) => void }) {
  const [systemMode, setSystemMode] = useState<SurfaceMode>(() =>
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  useLayoutEffect(() => {
    if (mode !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemMode(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);
  const errorHandler = useRef(onError);
  useLayoutEffect(() => { errorHandler.current = onError; }, [onError]);
  const [service] = useState<Service>(() => ({ entries: new Map(), invalidate() {}, requestDraw() {}, release() {}, report(error) { console.error(error); } }));
  useLayoutEffect(() => {
    service.report = error => errorHandler.current(error);
    const engine = createEngine(service.entries, service.report);
    service.invalidate = engine.invalidate;
    service.requestDraw = engine.requestDraw;
    service.release = engine.release;
    engine.invalidate();
    return () => { service.invalidate = () => {}; service.requestDraw = () => {}; service.release = () => {}; engine.dispose(); };
  }, [service]);
  return <ModeContext value={mode === 'system' ? systemMode : mode}><Context value={service}>{children}</Context></ModeContext>;
}

/** A stable definition + readonly props. Instances are owned by committed DOM bindings. */
export function useSurface<P, T extends HTMLElement = HTMLElement>(
  { appearance, props, enabled = true }: SurfaceOptions<P>, forwardedRef?: Ref<T>,
) {
  const mode = useSurfaceMode();
  const service = useContext(Context);
  if (!service) throw new Error('useSurface requires SurfaceProvider');
  const [element, setElement] = useState<T | null>(null);
  const committed = useRef({ props, mode });
  const budget = useRef<{ element: T; appearance: Appearance<P>; initial: number } | null>(null);
  const active = useRef<{ mesh: Mesh; instance: AppearanceInstance<P> } | null>(null);
  // Commit inputs before lifecycle effects; abandoned renders never mutate instances.
  useLayoutEffect(() => { committed.current = { props, mode }; });
  useLayoutEffect(() => {
    if (!element || !enabled) return;
    let instance: AppearanceInstance<P>;
    try { instance = appearance.create(committed.current.props, { mode: committed.current.mode }); }
    catch(error) { service.report(error); return; }
    if (!budget.current || budget.current.element !== element || budget.current.appearance !== appearance) {
      budget.current = { element, appearance, initial: instance.material.bounds.initial };
    }
    const mesh: Mesh = { element, material: instance.material, initialBudget: budget.current.initial };
    const binding = { mesh, instance }; active.current = binding;
    return () => {
      if (service.entries.get(element) === mesh) service.entries.delete(element);
      service.release(mesh);
      if (active.current === binding) active.current = null;
      try { instance.dispose?.(); } catch(error) { service.report(error); }
      service.invalidate();
    };
  }, [element, appearance, enabled, service]);
  useLayoutEffect(() => {
    const binding = active.current;
    if (!binding) return;
    try {
      const update = binding.instance.update(props, { mode });
      const previous = binding.mesh.material;
      binding.mesh.material = binding.instance.material;
      const registered = service.entries.get(binding.mesh.element) === binding.mesh;
      if (enabled) service.entries.set(binding.mesh.element, binding.mesh);
      else if (registered) service.entries.delete(binding.mesh.element);
      if (registered !== enabled || previous !== binding.mesh.material || update === 'layout') service.invalidate();
      else if (enabled && update === 'draw') service.requestDraw();
    } catch(error) { service.report(error); }
  });
  return useCallback((node: T | null) => {
    setElement(node);
    const cleanup: unknown = typeof forwardedRef === 'function' ? forwardedRef(node) : undefined;
    if (forwardedRef && typeof forwardedRef !== 'function') forwardedRef.current = node;
    return () => {
      setElement(current => current === node ? null : current);
      if (typeof cleanup === 'function') cleanup();
      else if (typeof forwardedRef === 'function') forwardedRef(null);
      else if (forwardedRef) forwardedRef.current = null;
    };
  }, [forwardedRef]);
}
