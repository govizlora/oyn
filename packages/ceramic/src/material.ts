import {
  createParameters,
  type Material,
  type ColorScheme,
} from "@oyn/surface";
import { ceramicBinding } from "./interaction.js";
import { insetWGSL, insetParameters } from "./inset.js";
import { ceramicWGSL } from "./shaders.js";
import { shadowBounds } from "./bounds.js";
import { ceramicFinish, type CeramicOptions } from "./finish.js";

export type CeramicMaterial = Material & { setElevation(value: number): void };
/** Animation libraries explicitly bind to setElevation. */
export function createCeramicMaterial(
  options: CeramicOptions = {},
): CeramicMaterial {
  return createMaterial(options);
}
/** Internal factory shared by imperative and declarative entry points. */
export function createMaterial(
  options: CeramicOptions,
  reservedElevation?: number,
): CeramicMaterial {
  const {
    values,
    rgb,
    elevation: initialElevation,
    validateSignedElevation,
  } = ceramicFinish(options);
  const paddingElevation = Math.max(
    0,
    reservedElevation ?? initialElevation,
    options.maxElevation ?? 0,
  );
  let elevation = initialElevation;
  const parameters = createParameters(values);
  // Bounds and GPU consume the same f32 optical parameters.
  const raised = parameters.snapshot();
  const shadow = raised.slice(12, 16);
  const raisedPasses = ["shadow", "surface"];
  const insetPasses = ["surface"];
  function updateElevation(value: number) {
    validateSignedElevation(value);
    const wasInset = elevation < 0;
    if (value >= 0 && !wasInset) {
      elevation = value;
      parameters.set(1, value);
      return;
    }
    const values =
      value < 0
        ? [...insetParameters(-value, rgb), ...Array(12).fill(0)]
        : Array.from(raised);
    if (value >= 0) values[1] = value;
    if (!values.every((v) => Number.isFinite(Math.fround(v))))
      throw Error("Ceramic elevation exceeds optical parameter range.");
    elevation = value;
    values.forEach((v, i) => parameters.set(i, v));
  }
  updateElevation(elevation);
  // Cache per-colorScheme instances: sharing the source across differently themed surfaces is safe.
  const variants = new Map<ColorScheme, CeramicMaterial>();
  return {
    bind: ceramicBinding(options.light),
    resolveColorScheme:
      options.colorScheme === undefined
        ? (colorScheme) => {
            let material = variants.get(colorScheme);
            if (!material) {
              material = createMaterial(
                { ...options, colorScheme, elevation, maxElevation: paddingElevation },
                paddingElevation,
              );
              variants.set(colorScheme, material);
            }
            return material;
          }
        : undefined,
    get shader() {
      return elevation < 0 ? insetWGSL : ceramicWGSL;
    },
    parameters,
    get passes() {
      return elevation < 0 ? insetPasses : raisedPasses;
    },
    measurePadding: (width, height) =>
      shadowBounds(width, height, paddingElevation, shadow),
    setElevation(value: number) {
      updateElevation(value);
      variants.forEach((material) => material.setElevation(value));
    },
  };
}
