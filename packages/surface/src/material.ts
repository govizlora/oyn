import type { Point, SurfaceInputs } from './input.js';
/** A fixed-layout block of f32 parameters. Updates never involve React or layout. */
export function createParameters(initial: readonly number[]) {
  if (!initial.length || initial.length % 4 || !initial.every(value => Number.isFinite(value) && Number.isFinite(Math.fround(value)))) throw Error('Parameters must be finite f32 values in groups of four.');
  const values = new Float32Array(initial);
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    get version() { return version; },
    get length() { return values.length; },
    get(index: number) { return values[index]; },
    snapshot() { return values.slice(); },
    set(index: number, value: number) {
      if (!Number.isInteger(index) || index < 0 || index >= values.length || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw Error('Invalid parameter update.');
      if (values[index] === Math.fround(value)) return;
      values[index] = value;
      version++;
      listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export type Parameters = ReturnType<typeof createParameters>;
export type Insets = Readonly<{ x: number; y: number }>;
export type SurfaceMode = 'light' | 'dark';
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
  /** Resolve inherited appearance without mutating a material shared by providers. */
  resolveMode?(mode: SurfaceMode): Material;
  /** May switch with parameter notifications; keep the parameter block layout stable.
   * WGSL: vertex entry `vertex`, binding 0 frame, binding 1 parameters. */
  shader: string;
  /** Optional immutable read-only storage at binding 2; never uploaded per frame. */
  data?: StaticData;
  parameters: Parameters;
  /** Fragment entry points, drawn in this order within this surface only. */
  passes: readonly string[];
  bounds: Readonly<{
    initial: number;
    max?: number;
    measure(width: number, height: number, budget: number): Insets;
  }>;
}>;
