// Public entry point only. Internal modules import their dependencies directly.
export type {
  Material,
  MaterialInstance,
  MaterialUpdate,
  Parameters,
  Insets,
  StaticData,
  SurfaceBinding,
  SurfaceBindingContext,
  SurfaceFrame,
  FrameExtras,
} from "./types/material.js";
export { createParameters } from "./createParameters.js";
export type {
  Point,
  PointerInput,
  PointerSnapshot,
  SurfaceInputs,
} from "./types/input.js";
export { createEngine, type Engine } from "./engine.js";
export { createSurface, type SurfaceOptions } from "./surface.js";
export { bindMotion, type MotionNumber } from "./adapters/motion.js";
