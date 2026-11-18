import { createParameters, type Material } from "@oyn/surface";
import { ceramicDomBinding } from "../interaction.js";
import { ceramicFinish, type CeramicOptions } from "../finish.js";
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
/** No recipe, compiler, ray marcher or per-shape shader in the runtime API. */
export function bakedCeramic(
  geometry: BakedGeometry,
  options: BakedOptions = {},
): BakedMaterial {
  let elevation = options.elevation ?? geometry.height,
    rotation = options.rotation ?? 0;
  const maxElevation = options.maxElevation ?? elevation;
  const { values, validateSignedElevation } = ceramicFinish({
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
  const variants = new Map<string, BakedMaterial>();
  return {
    bind: ceramicDomBinding,
    shader: bakedWGSL,
    parameters,
    data: geometry.data,
    passes: ["shadow", "surface"],
    resolveMode:
      options.mode === undefined
        ? (mode) => {
            let variant = variants.get(mode);
            if (!variant) {
              variant = bakedCeramic(geometry, {
                ...options,
                mode,
                elevation,
                rotation,
              });
              variants.set(mode, variant);
            }
            return variant;
          }
        : undefined,
    measurePadding: (w, h) => {
      const height =
        maxElevation * Math.min(w / geometry.width, h / geometry.depth);
      if (height >= shadow[0])
        throw Error("Baked geometry exceeds Ceramic light height.");
      return shadowBounds(w, h, height, shadow);
    },
    setElevation(value: number) {
      validateHeight(value);
      elevation = value;
      parameters.set(8, value);
      variants.forEach((v) => v.setElevation(value));
    },
    setRotation(value: number) {
      validateRotation(value);
      rotation = value;
      parameters.set(9, value);
      variants.forEach((v) => v.setRotation(value));
    },
  };
}
