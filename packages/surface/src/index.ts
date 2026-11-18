// Public entry point only. Internal modules import their dependencies directly.
export { SurfaceProvider } from './react/SurfaceProvider.js';
export { useSurface } from './react/useSurface.js';
export type { SurfaceOptions } from './react/useSurface.js';
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
