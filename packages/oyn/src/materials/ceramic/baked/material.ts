import { environmentBinding, preferredColorScheme } from "../environment.js";
import { createParameters } from "../../../core/createParameters.js";
import type {
  Material,
  MaterialInstance,
  MaterialUpdate,
} from "../../../core/types/material.js";
import { ceramicBinding } from "../interaction.js";
import {
  ceramicFinish,
  snapshotCeramicOptions,
  type CeramicOptions,
} from "../finish.js";
import { receiverBounds } from "../bounds.js";
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
export type BakedProps = BakedOptions & { geometry: BakedGeometry };
export type BakedMaterial = MaterialInstance<BakedProps> & {
  setElevation(value: number): void;
  setRotation(value: number): void;
  update(props: Readonly<BakedProps>): MaterialUpdate;
};
export const baked: Material<BakedProps> = {
  create: ({ geometry, ...options }) => bakedCeramic(geometry, options),
};

export function bakedCeramic(
  geometry: BakedGeometry,
  options: BakedOptions = {},
): BakedMaterial {
  let config = snapshotCeramicOptions(options);
  const finishKey = ({ elevation, rotation, ...finish }: BakedOptions) =>
    JSON.stringify(finish);
  let key = finishKey(config);
  let elevation = config.elevation ?? geometry.height;
  let rotation = config.rotation ?? 0;
  let maxElevation = config.maxElevation ?? elevation;
  const listeners = new Set<() => void>();
  const create = (colorScheme: import("../environment.js").ColorScheme) =>
    resolvedBakedCeramic(geometry, {
      ...config,
      colorScheme,
      elevation,
      rotation,
      maxElevation,
    });
  const initial = create(config.colorScheme ?? preferredColorScheme());
  let writeElevation = initial.setElevation,
    writeRotation = initial.setRotation;
  const bind = () =>
    environmentBinding(config.colorScheme, create, (update) => {
      listeners.add(update);
      return () => listeners.delete(update);
    });
  const material: BakedMaterial = Object.assign(initial, {
    bind: bind(),
    setElevation(value: number) {
      writeElevation(value);
      elevation = value;
      listeners.forEach((update) => update());
    },
    setRotation(value: number) {
      writeRotation(value);
      rotation = value;
      listeners.forEach((update) => update());
    },
    update(next: Readonly<BakedProps>): MaterialUpdate {
      const { geometry: nextGeometry, ...options } = next;
      const nextConfig = snapshotCeramicOptions(options);
      const nextKey = finishKey(nextConfig);
      if (nextGeometry !== geometry || nextKey !== key) {
        const resolved = resolvedBakedCeramic(nextGeometry, {
          ...nextConfig,
          colorScheme: nextConfig.colorScheme ?? preferredColorScheme(),
        });
        geometry = nextGeometry;
        config = nextConfig;
        key = nextKey;
        elevation = config.elevation ?? geometry.height;
        rotation = config.rotation ?? 0;
        maxElevation = config.maxElevation ?? elevation;
        writeElevation = resolved.setElevation;
        writeRotation = resolved.setRotation;
        material.parameters = resolved.parameters;
        material.data = resolved.data;
        material.passes = resolved.passes;
        material.measurePadding = resolved.measurePadding;
        material.bind = bind();
        return "layout";
      }
      const height = next.elevation ?? geometry.height,
        angle = next.rotation ?? 0;
      if (elevation === height && rotation === angle) return;
      material.setElevation(height);
      material.setRotation(angle);
      return "draw";
    },
  });
  return material;
}

/** No recipe, compiler, ray marcher or per-shape shader in the runtime API. */
function resolvedBakedCeramic(
  geometry: BakedGeometry,
  options: BakedOptions = {},
): MaterialInstance & {
  setElevation(value: number): void;
  setRotation(value: number): void;
} {
  let elevation = options.elevation ?? geometry.height,
    rotation = options.rotation ?? 0;
  const maxElevation = options.maxElevation ?? elevation;
  const { values, validateSignedElevation, shadows, frostReachPerHeight } =
    ceramicFinish({
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
    bind: ceramicBinding(options.light, true),
    shader: bakedWGSL,
    parameters,
    data: geometry.data,
    passes:
      shadows || (frostReachPerHeight > 0 && maxElevation > 0)
        ? ["shadow", "surface"]
        : ["surface"],
    measurePadding: (w, h) => {
      const height =
        maxElevation * Math.min(w / geometry.width, h / geometry.depth);
      if (height >= shadow[0])
        throw Error("Baked geometry exceeds Ceramic light height.");
      return receiverBounds(w, h, height, shadow, shadows, frostReachPerHeight);
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
