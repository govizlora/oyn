import { ceramicDefaults } from "./defaults.js";
import {
  environmentBinding,
  preferredColorScheme,
  type ColorScheme,
} from "./environment.js";
import { createParameters } from "../../core/createParameters.js";
import type {
  Material,
  MaterialInstance,
  MaterialUpdate,
} from "../../core/types/material.js";
import { ceramicBinding } from "./interaction.js";
import { ceramicWGSL } from "./shaders.js";
import { receiverBounds } from "./bounds.js";
import {
  ceramicFinish,
  snapshotCeramicOptions,
  type CeramicOptions,
} from "./finish.js";

export type CeramicProps = CeramicOptions;
export type CeramicMaterial = MaterialInstance<CeramicProps> & {
  setElevation(value: number): void;
  update(props: Readonly<CeramicProps>): MaterialUpdate;
};

export const ceramic = {
  create: createCeramicMaterial,
} satisfies Material<CeramicProps>;

/** The same instance serves declarative updates and caller-owned numeric sources. */
export function createCeramicMaterial(
  options: CeramicOptions = {},
): CeramicMaterial {
  let config = snapshotCeramicOptions(options);
  let key = JSON.stringify(config);
  const finishKey = ({ elevation, ...finish }: CeramicProps) =>
    JSON.stringify(finish);
  let finish = finishKey(config);
  let elevation = config.elevation;
  const reservation = Math.max(0, elevation ?? ceramicDefaults.elevation);
  const listeners = new Set<(value: number) => void>();
  const create = (colorScheme: ColorScheme) =>
    createResolvedMaterial({ ...config, colorScheme, elevation }, reservation);
  const initial = create(config.colorScheme ?? preferredColorScheme());
  let writeElevation = initial.setElevation;
  const bind = () =>
    environmentBinding(config.colorScheme, create, (update) => {
      const receive = (value: number) =>
        update((target) => target.setElevation(value));
      listeners.add(receive);
      return () => listeners.delete(receive);
    });
  const material: CeramicMaterial = Object.assign(initial, {
    bind: bind(),
    setElevation(value: number) {
      writeElevation(value);
      elevation = value;
      listeners.forEach((update) => update(value));
    },
    update(next: Readonly<CeramicProps>): MaterialUpdate {
      const nextConfig = snapshotCeramicOptions(next);
      const nextKey = JSON.stringify(nextConfig);
      if (key === nextKey) return;
      const nextFinish = finishKey(nextConfig);
      if (finish === nextFinish) {
        material.setElevation(
          nextConfig.elevation ?? ceramicDefaults.elevation,
        );
        config = nextConfig;
        key = nextKey;
        return "draw";
      }
      // Validate the complete configuration before publishing any changed state.
      const resolved = createResolvedMaterial(
        {
          ...nextConfig,
          colorScheme: nextConfig.colorScheme ?? preferredColorScheme(),
        },
        reservation,
      );
      config = nextConfig;
      elevation = config.elevation;
      key = nextKey;
      finish = nextFinish;
      writeElevation = resolved.setElevation;
      material.parameters = resolved.parameters;
      material.measurePadding = resolved.measurePadding;
      material.bind = bind();
      return "layout";
    },
  });
  return material;
}

/** Internal factory shared by imperative and declarative entry points. */
function createResolvedMaterial(
  options: CeramicOptions & { colorScheme: ColorScheme },
  reservedElevation?: number,
): MaterialInstance & { setElevation(value: number): void } {
  const {
    values,
    elevation: initialElevation,
    validateSignedElevation,
    shadows,
    frostReachPerHeight,
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
    bind: ceramicBinding(options.light, true),
    shader: ceramicWGSL,
    parameters,
    // The signed surface composites its own shadow, avoiding an empty draw pass
    // below the plane and a pipeline change when crossing it.
    passes: ["surface"],
    measurePadding: (width, height) =>
      receiverBounds(
        width,
        height,
        paddingElevation,
        shadow,
        shadows,
        frostReachPerHeight,
      ),
    setElevation(value: number) {
      validateSignedElevation(value);
      parameters.set(1, value);
    },
  };
}
