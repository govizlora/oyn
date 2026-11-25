import type { Point, SurfaceInputs } from "./input.js";
import type { createParameters } from "../createParameters.js";

export type Parameters = ReturnType<typeof createParameters>;
export type Insets = Readonly<{ x: number; y: number }>;
/** Immutable payload. The renderer owns its GPU copy and shares it by identity. */
export type StaticData = Readonly<{ bytes: Uint8Array<ArrayBuffer> }>;
/** MaterialInstance-owned extension lanes in the 64-byte frame ABI: offsets 2, 3, 8 and optionally 11–13.
 * Surface does not interpret these as pointer coordinates, light or corner radius. */
export type FrameExtras =
  | readonly [number, number, number]
  | readonly [number, number, number, number]
  | readonly [number, number, number, number, number, number];
export type SurfaceFrame = Readonly<{
  element: HTMLElement;
  width: number;
  height: number;
  toLocal(point: Point): Point;
}>;
export type SurfaceBinding = Readonly<{
  /** Optional target-local material. Its bind hook is not recursively invoked. */
  material?: MaterialInstance;
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
export type MaterialUpdate = "layout" | "draw" | void;
/** Stable definition. Creation and updates happen only after host binding/commit. */
export type Material<P> = Readonly<{
  create(props: Readonly<P>): MaterialInstance<P>;
}>;
/** One live drawing object; no nested appearance/program wrapper. */
export type MaterialInstance<P = never> = {
  update?(props: Readonly<P>): MaterialUpdate;
  dispose?(): void;
  /** Optional per-target subscription/DOM lifecycle. Never runs during React render. */
  bind?(context: SurfaceBindingContext): SurfaceBinding;
  /** May switch with parameter notifications; keep the parameter block layout stable.
   * WGSL: vertex entry `vertex`, binding 0 frame, binding 1 parameters. */
  shader: string;
  /** Optional build-generated programs, indexed by the original WGSL and entry point. */
  loadWebGL2?: () => Promise<
    ReadonlyMap<
      string,
      {
        vertex: string;
        fragments: Readonly<Record<string, string>>;
        blocks: Readonly<Record<string, number>>;
      }
    >
  >;
  /** Optional immutable read-only storage at binding 2; never uploaded per frame. */
  data?: StaticData;
  parameters: Parameters;
  /** Fragment entry points, drawn in order. Empty means no presentation; the
   * binding stays alive. Notify parameters/requestDraw when drawability changes. */
  passes: readonly string[];
  /** Material-owned exterior padding in CSS pixels, measured per axis.
   * Return zero for effects contained within the element. */
  measurePadding(width: number, height: number): Insets;
};
