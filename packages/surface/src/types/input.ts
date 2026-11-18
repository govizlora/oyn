/** Input facts only. No light, hover effect, fallback position or return animation. */
export type Point = Readonly<{ x: number; y: number }>;
export type PointerSnapshot = Readonly<{
  position: Point | null;
  inside: boolean;
  focused: boolean;
  visible: boolean;
}>;
export type PointerInput = Readonly<{
  getSnapshot(): PointerSnapshot;
  subscribe(listener: () => void): () => void;
}>;
export type SurfaceInputs = Readonly<{ pointer: PointerInput }>;
