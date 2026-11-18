import { ceramicDefaults } from "./defaults.js";
import { environmentBinding, preferredColorScheme } from "./environment.js";
import { createParameters, type Material } from "@oyn/surface";
import { ceramicBinding } from "./interaction.js";
import { insetWGSL, insetParameters } from "./inset.js";
import { ceramicWGSL } from "./shaders.js";
import { shadowBounds } from "./bounds.js";
import {
  ceramicFinish,
  snapshotCeramicOptions,
  type CeramicOptions,
} from "./finish.js";

export type CeramicMaterial = Material & { setElevation(value: number): void };
/** Animation libraries explicitly bind to setElevation. */
export function createCeramicMaterial(
  options: CeramicOptions = {},
): CeramicMaterial {
  return createMaterial(options);
}
/**
 * Shared factory. Every attached target owns a parameter block and environment;
 * changing the imperative elevation updates all attached targets.
 */
export function createMaterial(
  options: CeramicOptions,
  reservedElevation?: number,
): CeramicMaterial {
  const config = snapshotCeramicOptions(options);
  let elevation = config.elevation;
  const reservation =
    reservedElevation ?? config.elevation ?? ceramicDefaults.elevation;
  const listeners = new Set<() => void>();
  const create = (colorScheme: import("./environment.js").ColorScheme) =>
    createResolvedMaterial({ ...config, colorScheme, elevation }, reservation);
  const material = create(config.colorScheme ?? preferredColorScheme());
  const setElevation = material.setElevation;
  material.setElevation = (value) => {
    setElevation(value);
    elevation = value;
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

/** Internal factory shared by imperative and declarative entry points. */
function createResolvedMaterial(
  options: CeramicOptions,
  reservedElevation?: number,
): CeramicMaterial {
  const {
    values,
    rgb,
    elevation: initialElevation,
    validateSignedElevation,
    shadows,
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
  return {
    bind: ceramicBinding(options.light),
    get shader() {
      return elevation < 0 ? insetWGSL : ceramicWGSL;
    },
    parameters,
    get passes() {
      return elevation < 0 || !shadows ? insetPasses : raisedPasses;
    },
    measurePadding: (width, height) =>
      shadows
        ? shadowBounds(width, height, paddingElevation, shadow)
        : { x: 0, y: 0 },
    setElevation(value: number) {
      updateElevation(value);
    },
  };
}
