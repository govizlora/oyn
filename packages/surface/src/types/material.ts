import type { Point, SurfaceInputs } from "./input.js";
import type { createParameters } from "../createParameters.js";

export type Parameters = ReturnType<typeof createParameters>;
export type Insets = Readonly<{ x: number; y: number }>;
/** Immutable payload. The renderer owns its GPU copy and shares it by identity. */
export type StaticData = Readonly<{ bytes: Uint8Array<ArrayBuffer> }>;
/** Material-owned extension lanes in the 48-byte frame ABI: offsets 2, 3, 8.
 * Surface does not interpret these as pointer coordinates, light or corner radius. */
export type FrameExtras = readonly [number, number, number];
export type SurfaceFrame = Readonly<{
  element: HTMLElement;
  width: number;
  height: number;
  toLocal(point: Point): Point;
}>;
export type SurfaceBinding = Readonly<{
  /** Optional target-local material. Its bind hook is not recursively invoked. */
  material?: Material;
  measure?(): void;
  frame?(frame: SurfaceFrame): FrameExtras;
  dispose?(): void;
}>;
export type SurfaceBindingContext = Readonly<{
  element: HTMLElement;
  signal: AbortSignal;
  inputs: SurfaceInputs;
  requestDraw(): void;
  requestMeasure(): void;
}>;
export type Material = Readonly<{
  /** Optional per-target subscription/DOM lifecycle. Never runs during React render. */
  bind?(context: SurfaceBindingContext): SurfaceBinding;
  /** May switch with parameter notifications; keep the parameter block layout stable.
   * WGSL: vertex entry `vertex`, binding 0 frame, binding 1 parameters. */
  shader: string;
  /** Optional immutable read-only storage at binding 2; never uploaded per frame. */
  data?: StaticData;
  parameters: Parameters;
  /** Fragment entry points, drawn in this order within this surface only. */
  passes: readonly string[];
  /** Appearance-owned exterior padding in CSS pixels, measured per axis.
   * Return zero for effects contained within the element. */
  measurePadding(width: number, height: number): Insets;
}>;
