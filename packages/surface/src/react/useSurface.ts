import {
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Mesh } from '../types/scene.js';
import type { Appearance, AppearanceInstance } from '../types/appearance.js';
import { SurfaceContext } from './SurfaceContext.js';
import { useSurfaceMode } from './useSurfaceMode.js';

export type SurfaceOptions<P> = {
  appearance: Appearance<P>;
  props: NoInfer<P>;
  enabled?: boolean;
};
/** A stable definition + readonly props. Instances are owned by committed DOM bindings. */
export function useSurface<P, T extends HTMLElement = HTMLElement>(
  { appearance, props, enabled = true }: SurfaceOptions<P>,
) {
  const mode = useSurfaceMode();
  const service = useContext(SurfaceContext);
  if (!service) throw new Error('useSurface requires SurfaceProvider');

  // Binding state: DOM target, last committed inputs, live instance.
  const [element, setElement] = useState<T | null>(null);
  const committed = useRef({ props, mode });
  const active = useRef<{ mesh: Mesh; instance: AppearanceInstance<P> } | null>(
    null,
  );

  // 1. Commit inputs before lifecycle effects; abandoned renders never mutate instances.
  useLayoutEffect(() => {
    committed.current = { props, mode };
  });

  // 2. Own the instance lifetime for this target/appearance/enabled combination.
  useLayoutEffect(() => {
    if (!element || !enabled) return;
    let instance: AppearanceInstance<P>;
    try {
      instance = appearance.create(committed.current.props, {
        mode: committed.current.mode,
      });
    } catch (error) {
      service.report(error);
      return;
    }
    const mesh: Mesh = {
      element,
      material: instance.material,
    };
    const binding = { mesh, instance };
    active.current = binding;
    return () => {
      if (service.entries.get(element) === mesh)
        service.entries.delete(element);
      service.release(mesh);
      if (active.current === binding) active.current = null;
      try {
        instance.dispose?.();
      } catch (error) {
        service.report(error);
      }
      service.invalidate();
    };
  }, [element, appearance, enabled, service]);

  // 3. Apply committed props and register the current material with the engine.
  useLayoutEffect(() => {
    const binding = active.current;
    if (!binding) return;
    try {
      const update = binding.instance.update(props, { mode });
      const previous = binding.mesh.material;
      binding.mesh.material = binding.instance.material;
      const registered =
        service.entries.get(binding.mesh.element) === binding.mesh;
      if (enabled) service.entries.set(binding.mesh.element, binding.mesh);
      else if (registered) service.entries.delete(binding.mesh.element);
      if (
        registered !== enabled ||
        previous !== binding.mesh.material ||
        update === 'layout'
      )
        service.invalidate();
      else if (enabled && update === 'draw') service.requestDraw();
    } catch (error) {
      service.report(error);
    }
  });

  // 4. Connect the DOM target; consumers compose any additional refs.
  return useCallback((node: T | null) => {
    setElement(node);
    return () => {
      setElement((current) => (current === node ? null : current));
    };
  }, []);
}
