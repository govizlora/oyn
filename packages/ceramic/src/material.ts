import { ceramicDefaults } from "./defaults.js";
import {
  environmentBinding,
  preferredColorScheme,
  type ColorScheme,
} from "./environment.js";
import { createParameters, type Material } from "@oyn/surface";
import { ceramicBinding } from "./interaction.js";
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
  const listeners = new Set<(value: number) => void>();
  const create = (colorScheme: ColorScheme) =>
    createResolvedMaterial({ ...config, colorScheme, elevation }, reservation);
  const material = create(config.colorScheme ?? preferredColorScheme());
  const setElevation = material.setElevation;
  material.setElevation = (value) => {
    setElevation(value);
    elevation = value;
    listeners.forEach((update) => update(value));
  };
  Object.defineProperty(material, "bind", {
    value: environmentBinding(config.colorScheme, create, (update) => {
      const receive = (value: number) =>
        update((target) => target.setElevation(value));
      listeners.add(receive);
      return () => listeners.delete(receive);
    }),
  });
  return material;
}

/** Internal factory shared by imperative and declarative entry points. */
function createResolvedMaterial(
  options: CeramicOptions & { colorScheme: ColorScheme },
  reservedElevation?: number,
): CeramicMaterial {
  const {
    values,
    elevation: initialElevation,
    validateSignedElevation,
    shadows,
  } = ceramicFinish(options);
  const paddingElevation = Math.max(
    0,
    reservedElevation ?? initialElevation,
    options.maxElevation ?? 0,
  );
  const parameters = createParameters(values);
  // Bounds and GPU consume the same f32 optical parameters.
  const shadow = parameters.snapshot().slice(12, 16);
  return {
    bind: ceramicBinding(options.light),
    loadWebGL2: loadCeramic,
    shader: ceramicWGSL,
    parameters,
    // The signed surface composites its own shadow, avoiding an empty draw pass
    // below the plane and a pipeline change when crossing it.
    passes: ["surface"],
    measurePadding: (width, height) =>
      shadows
        ? shadowBounds(width, height, paddingElevation, shadow)
        : { x: 0, y: 0 },
    setElevation(value: number) {
      validateSignedElevation(value);
      parameters.set(1, value);
    },
  };
}

function loadCeramic() {
  return import("./generated/ceramic.js").then((m) => m.default);
}
