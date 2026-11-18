import type { Material } from './material.js';
/** Lifetime is the DOM binding, not a material identity or a GPU initialization. */
export type Mesh = {
  element: HTMLElement;
  material: Material;
};
