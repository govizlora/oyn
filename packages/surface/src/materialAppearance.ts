import type { Appearance } from "./types/appearance.js";
import type { Material } from "./types/material.js";

/** Adapter for externally owned GPU programs; no theme policy. */
export const materialAppearance: Appearance<{ material: Material }> = {
  create(props) {
    let material = props.material;
    return {
      get material() {
        return material;
      },
      update(next) {
        if (next.material === material) return;
        material = next.material;
        return "layout";
      },
    };
  },
};
