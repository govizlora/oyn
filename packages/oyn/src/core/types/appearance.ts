import type { Material } from './material.js';
export type AppearanceUpdate = 'layout' | 'draw' | void;
export type AppearanceInstance<P> = {
  readonly material: Material;
  update(props: Readonly<P>): AppearanceUpdate;
  dispose?(): void;
};
/** Stable definition. create/update run after commit, never during React render. */
export type Appearance<P> = Readonly<{
  create(props: Readonly<P>): AppearanceInstance<P>;
}>;
