import type { Appearance } from './types/appearance.js';
import type { Material, ColorScheme } from './types/material.js';

/** Explicit low-level appearance for externally controlled GPU programs.
 * Same Surface lifecycle; not a separate renderer or a material-only hook overload. */
export const materialAppearance: Appearance<{ material: Material; colorScheme?: ColorScheme }> = {
  create(props) {
    let source = props.material,
      colorScheme = props.colorScheme ?? 'light';
    let material = source.resolveColorScheme?.(colorScheme) ?? source;
    return {
      get material() {
        return material;
      },
      update(next) {
        if (next.material === source && (next.colorScheme ?? 'light') === colorScheme) return;
        source = next.material;
        colorScheme = next.colorScheme ?? 'light';
        material = source.resolveColorScheme?.(colorScheme) ?? source;
        return 'layout';
      },
    };
  },
};
