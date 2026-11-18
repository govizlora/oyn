import { environmentBinding, preferredColorScheme } from "../environment.js";
import { createParameters, type Material } from "@oyn/surface";
import { ceramicBinding } from "../interaction.js";
import {
  ceramicFinish,
  snapshotCeramicOptions,
  type CeramicOptions,
} from "../finish.js";
import { shadowBounds } from "../bounds.js";
import type { BakedGeometry } from "./geometry.js";
import { bakedWGSL } from "./shader.js";

export type BakedOptions = Omit<
  CeramicOptions,
  "elevation" | "maxElevation"
> & {
  /** Rigid placement of a baked rounded control, not a geometry rebuild. */
  elevation?: number;
  maxElevation?: number;
  rotation?: number;
};
export type BakedMaterial = Material & {
  setElevation(value: number): void;
  setRotation(value: number): void;
};
export function bakedCeramic(
  geometry: BakedGeometry,
  options: BakedOptions = {},
): BakedMaterial {
  const config = snapshotCeramicOptions(options);
  let elevation = config.elevation ?? geometry.height,
    rotation = config.rotation ?? 0;
  const maxElevation = config.maxElevation ?? elevation;
  const listeners = new Set<() => void>();
  const create = (colorScheme: import("../environment.js").ColorScheme) =>
    resolvedBakedCeramic(geometry, {
      ...config,
      colorScheme,
      elevation,
      rotation,
      maxElevation,
    });
  const material = create(config.colorScheme ?? preferredColorScheme());
  const setElevation = material.setElevation,
    setRotation = material.setRotation;
  material.setElevation = (value) => {
    setElevation(value);
    elevation = value;
    listeners.forEach((update) => update());
  };
  material.setRotation = (value) => {
    setRotation(value);
    rotation = value;
    listeners.forEach((update) => update());
  };
  Object.defineProperty(material, "bind", {
    value: environmentBinding(config.colorScheme, create, (update) => {
      listeners.add(update);
      return () => listeners.delete(update);
    }),
  });
  return material;
}

/** No recipe, compiler, ray marcher or per-shape shader in the runtime API. */
function resolvedBakedCeramic(
  geometry: BakedGeometry,
  options: BakedOptions = {},
): BakedMaterial {
  let elevation = options.elevation ?? geometry.height,
    rotation = options.rotation ?? 0;
  const maxElevation = options.maxElevation ?? elevation;
  const { values, validateSignedElevation, shadows } = ceramicFinish({
    ...options,
    elevation,
    maxElevation,
  });
  function validateHeight(value: number) {
    validateSignedElevation(value);
    if (
      value < 0 ||
      value > maxElevation ||
      (!geometry.analyticOutline && value !== geometry.height)
    )
      throw Error(
        "Invalid baked elevation. Only rounded controls support live elevation.",
      );
  }
  function validateRotation(value: number) {
    if (
      !Number.isFinite(value) ||
      !Number.isFinite(Math.fround(value)) ||
      (value !== 0 &&
        (!geometry.analyticOutline ||
          geometry.width !== geometry.depth ||
          geometry.radius !== geometry.width / 2))
    )
      throw Error("Rotation requires a circular baked control.");
  }
  validateHeight(elevation);
  validateRotation(rotation);
  const parameters = createParameters([
    geometry.resolution,
    geometry.extent,
    geometry.height,
    0,
    geometry.shadowResolution,
    geometry.shadowExtent,
    0,
    0,
    elevation,
    rotation,
    geometry.width,
    geometry.depth,
    geometry.radius,
    Number(geometry.analyticOutline),
    0,
    0,
    ...values,
  ]);
  const shadow = new Float32Array(values.slice(12, 16));
  const maxSigma = (shadow[1] * geometry.height) / (2 * shadow[0]);
  if (
    !geometry.analyticOutline &&
    maxSigma > Math.min(32, (geometry.shadowExtent - geometry.extent) / 8)
  )
    throw Error(
      "Ceramic light exceeds the baked shadow blur budget. Re-bake with a larger shadow field.",
    );
  return {
    bind: ceramicBinding(options.light),
    shader: bakedWGSL,
    parameters,
    data: geometry.data,
    passes: shadows ? ["shadow", "surface"] : ["surface"],
    measurePadding: (w, h) => {
      const height =
        maxElevation * Math.min(w / geometry.width, h / geometry.depth);
      if (height >= shadow[0])
        throw Error("Baked geometry exceeds Ceramic light height.");
      return shadows ? shadowBounds(w, h, height, shadow) : { x: 0, y: 0 };
    },
    setElevation(value: number) {
      validateHeight(value);
      elevation = value;
      parameters.set(8, value);
    },
    setRotation(value: number) {
      validateRotation(value);
      rotation = value;
      parameters.set(9, value);
    },
  };
}
