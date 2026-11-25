// Public entry point only. Internal modules import their dependencies directly.
export type {
  Material,
  Parameters,
  Insets,
  StaticData,
  SurfaceBinding,
  SurfaceBindingContext,
  SurfaceFrame,
  FrameExtras,
} from './types/material.js';
export { createParameters } from './createParameters.js';
export type {
  Appearance,
  AppearanceInstance,
  AppearanceUpdate,
} from './types/appearance.js';
export { materialAppearance } from './materialAppearance.js';
export type {
  Point,
  PointerInput,
  PointerSnapshot,
  SurfaceInputs,
} from './types/input.js';
