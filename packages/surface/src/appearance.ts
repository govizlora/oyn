import type { Material, SurfaceMode } from './material.js';
export type AppearanceContext = Readonly<{ mode: SurfaceMode }>;
export type AppearanceUpdate = 'layout' | 'draw' | void;
export type AppearanceInstance<P> = {
  readonly material: Material;
  update(props: Readonly<P>, context: AppearanceContext): AppearanceUpdate;
  dispose?(): void;
};
/** Stable definition. create/update run after commit, never during React render. */
export type Appearance<P> = Readonly<{
  create(props: Readonly<P>, context: AppearanceContext): AppearanceInstance<P>;
}>;
/** Explicit low-level appearance for externally controlled GPU programs.
 * Same Surface lifecycle; not a separate renderer or a material-only hook overload. */
export const materialAppearance: Appearance<{ material: Material }> = {
  create(props, context) {
    let source = props.material, mode = context.mode;
    let material = source.resolveMode?.(mode) ?? source;
    return {
      get material() { return material; },
      update(next, context) {
        if (next.material === source && context.mode === mode) return;
        source = next.material; mode = context.mode;
        material = source.resolveMode?.(mode) ?? source;
        return 'layout';
      },
    };
  },
};
