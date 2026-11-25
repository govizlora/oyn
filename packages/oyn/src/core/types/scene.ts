import type { MaterialInstance } from "./material.js";
/** Lifetime is the DOM binding, not a material identity or a GPU initialization. */
export type Mesh = {
  element: HTMLElement;
  dispose?(): void;
  material: MaterialInstance;
};
