import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { createEngine } from './engine.js';
import { type Mesh } from './scene.js';
import type { Material, SurfaceMode } from './material.js';

export type { Material, Parameters, Insets, SurfaceMode } from './material.js';
export { createParameters } from './material.js';
export type SurfaceOptions = { material: Material; enabled?: boolean };
type Service = {
  entries: Map<HTMLElement, Mesh>;
  invalidate: () => void;
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
  errorHandler.current = onError;
  const [service] = useState<Service>(() => ({ entries: new Map(), invalidate() {} }));
  useLayoutEffect(() => {
    const engine = createEngine(service.entries, error => errorHandler.current(error));
    service.invalidate = engine.invalidate;
    engine.invalidate();
    return () => { service.invalidate = () => {}; engine.dispose(); };
  }, [service]);
  return <ModeContext value={mode === 'system' ? systemMode : mode}><Context value={service}>{children}</Context></ModeContext>;
}

/** Optional forwarded ref is composed here, not reimplemented by every adapter. */
export function useSurface<T extends HTMLElement = HTMLDivElement>(
  { material: source, enabled = true }: SurfaceOptions, forwardedRef?: Ref<T>,
) {
  const mode = useSurfaceMode();
  const material = source.resolveMode?.(mode) ?? source;
  const service = useContext(Context);
  if (!service) throw new Error('useSurface requires SurfaceProvider');
  const mesh = useRef<Mesh | null>(null);
  const active = useRef(enabled);
  active.current = enabled;
  const latest = useRef(material);
  latest.current = material;
  useLayoutEffect(() => {
    if (mesh.current) {
      mesh.current.material = material;
      if (enabled) service.entries.set(mesh.current.element, mesh.current);
      else service.entries.delete(mesh.current.element);
      service.invalidate();
    }
  }, [service, material, enabled]);

  return useCallback((element: T | null) => {
    if (mesh.current) service.entries.delete(mesh.current.element);
    mesh.current = element ? { element, material: latest.current, initialBudget: latest.current.bounds.initial } : null;
    if (mesh.current && active.current) service.entries.set(element!, mesh.current);
    service.invalidate();
    const cleanup: unknown = typeof forwardedRef === 'function' ? forwardedRef(element) : undefined;
    if (forwardedRef && typeof forwardedRef !== 'function') forwardedRef.current = element;
    return () => {
      if (element) service.entries.delete(element);
      if (mesh.current?.element === element) mesh.current = null;
      service.invalidate();
      if (typeof cleanup === 'function') cleanup();
      else if (typeof forwardedRef === 'function') forwardedRef(null);
      else if (forwardedRef) forwardedRef.current = null;
    };
  }, [service, forwardedRef]);
}
