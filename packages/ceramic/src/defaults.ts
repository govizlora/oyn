import { ceramicLightDefaults } from "./interaction.js";
import defaults from "./defaults.json" with { type: "json" };

/** Tuned defaults based on the GPU Surfaces story. Workspace colors are application guidance. */
export const ceramicDefaults = Object.freeze({
  ...defaults,
  light: ceramicLightDefaults,
});
