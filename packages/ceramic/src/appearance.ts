import type { Appearance, Material } from "@oyn/surface";
import { ceramicBinding, type CeramicLight } from "./interaction.js";
import type { CeramicOptions } from "./finish.js";
import { ceramicDefaults } from "./defaults.js";
import { createMaterial } from "./material.js";

export type CeramicProps = CeramicOptions & { light?: CeramicLight };
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
    let binding = ceramicBinding(configuration.light);
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
        return binding;
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
        const lightKey = JSON.stringify(config.light);
        const lightChanged = lightKey !== JSON.stringify(configuration.light);
        const nextBinding = lightChanged
          ? ceramicBinding(config.light)
          : binding;
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
        binding = nextBinding;
        configuration = config;
        key = nextKey;
        return layout ? "layout" : "draw";
      },
    };
  },
};
