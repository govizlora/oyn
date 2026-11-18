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
