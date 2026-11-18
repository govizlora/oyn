import type { Appearance, Material } from "@oyn/surface";
import type { CeramicOptions } from "./finish.js";
import { ceramicDefaults } from "./defaults.js";
import { createMaterial } from "./material.js";

export type CeramicProps = CeramicOptions;
/** Stable visual definition. Each committed node owns its own parameter block. */
export const ceramic: Appearance<CeramicProps> = {
  create(props) {
    const read = (props: Readonly<CeramicProps>) => ({
      ...props,
      color: typeof props.color === "object" ? { ...props.color } : props.color,
      light: props.light
        ? {
            ...props.light,
            position: props.light.position
              ? { ...props.light.position }
              : undefined,
          }
        : undefined,
    });
    let configuration = read(props);
    let key = JSON.stringify(configuration);
    // Reserve the initial exterior height for this appearance instance only.
    const initialPaddingElevation = Math.max(
      0,
      configuration.elevation ?? ceramicDefaults.elevation,
    );
    const createOptical = (config: typeof configuration) =>
      createMaterial(config, initialPaddingElevation);
    let optical = createOptical(configuration);
    const parameters = optical.parameters;
    const material: Material = {
      get shader() {
        return optical.shader;
      },
      get passes() {
        return optical.passes;
      },
      measurePadding: (width, height) => optical.measurePadding(width, height),
      get bind() {
        return optical.bind;
      },
      parameters,
    };
    return {
      material,
      update(next) {
        const config = read(next),
          nextKey = JSON.stringify(config);
        if (key === nextKey) return;
        // Validate the complete next configuration before applying any change.
        const nextOptical = createOptical(config);
        const layout =
          config.maxElevation !== configuration.maxElevation ||
          config.shadowLightHeight !== configuration.shadowLightHeight ||
          config.shadowLightSize !== configuration.shadowLightSize ||
          config.shadowStrength !== configuration.shadowStrength ||
          config.contactShadowStrength !== configuration.contactShadowStrength;
        nextOptical.parameters
          .snapshot()
          .forEach((value, index) => parameters.set(index, value));
        optical = nextOptical;
        configuration = config;
        key = nextKey;
        return layout ? "layout" : "draw";
      },
    };
  },
};
