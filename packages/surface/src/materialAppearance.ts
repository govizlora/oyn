import type { Appearance } from './types/appearance.js';
import type { Material } from './types/material.js';

/** Explicit low-level appearance for externally controlled GPU programs.
 * Same Surface lifecycle; not a separate renderer or a material-only hook overload. */
export const materialAppearance: Appearance<{ material: Material }> = {
  create(props, context) {
    let source = props.material,
      mode = context.mode;
    let material = source.resolveMode?.(mode) ?? source;
    return {
      get material() {
        return material;
      },
      update(next, context) {
        if (next.material === source && context.mode === mode) return;
        source = next.material;
        mode = context.mode;
        material = source.resolveMode?.(mode) ?? source;
        return 'layout';
      },
    };
  },
};
