import type { Appearance } from "@oyn/surface";
import { snapshotCeramicOptions, type CeramicOptions } from "./finish.js";
import { ceramicDefaults } from "./defaults.js";
import { createMaterial } from "./material.js";

export type CeramicProps = CeramicOptions;
/** Stable visual definition. Bindings own target-local parameters; the renderer reuses GPU buffers. */
export const ceramic: Appearance<CeramicProps> = {
  create(props) {
    const read = snapshotCeramicOptions;
    const configuration = read(props);
    let key = JSON.stringify(configuration);
    // Reserve the initial exterior height for this appearance instance only.
    const initialPaddingElevation = Math.max(
      0,
      configuration.elevation ?? ceramicDefaults.elevation,
    );
    const createSource = (config: typeof configuration) =>
      createMaterial(config, initialPaddingElevation);
    let source = createSource(configuration);
    return {
      get material() {
        return source;
      },
      update(next) {
        const config = read(next),
          nextKey = JSON.stringify(config);
        if (key === nextKey) return;
        // Validate the complete next configuration before applying any change.
        const nextSource = createSource(config);
        source = nextSource;
        key = nextKey;
        return "layout";
      },
    };
  },
};
