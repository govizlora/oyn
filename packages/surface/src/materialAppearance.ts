import type { Appearance } from './types/appearance.js';
import type { Material, SurfaceMode } from './types/material.js';

/** Explicit low-level appearance for externally controlled GPU programs.
 * Same Surface lifecycle; not a separate renderer or a material-only hook overload. */
export const materialAppearance: Appearance<{ material: Material; mode?: SurfaceMode }> = {
  create(props) {
    let source = props.material,
      mode = props.mode ?? 'light';
    let material = source.resolveMode?.(mode) ?? source;
    return {
      get material() {
        return material;
      },
      update(next) {
        if (next.material === source && (next.mode ?? 'light') === mode) return;
        source = next.material;
        mode = next.mode ?? 'light';
        material = source.resolveMode?.(mode) ?? source;
        return 'layout';
      },
    };
  },
};
