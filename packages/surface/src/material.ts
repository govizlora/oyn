/** A fixed-layout block of f32 parameters. Updates never involve React or layout. */
export function createParameters(initial: readonly number[]) {
  if (!initial.length || initial.length % 4 || !initial.every(value => Number.isFinite(value) && Number.isFinite(Math.fround(value)))) throw Error('Parameters must be finite f32 values in groups of four.');
  const values = new Float32Array(initial);
  const listeners = new Set<() => void>();
  return {
    get length() { return values.length; },
    get(index: number) { return values[index]; },
    snapshot() { return values.slice(); },
    set(index: number, value: number) {
      if (!Number.isInteger(index) || index < 0 || index >= values.length || !Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw Error('Invalid parameter update.');
      if (values[index] === Math.fround(value)) return;
      values[index] = value;
      listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export type Parameters = ReturnType<typeof createParameters>;
export type Insets = Readonly<{ x: number; y: number }>;
export type SurfaceMode = 'light' | 'dark';
export type Material = Readonly<{
  /** Resolve inherited appearance without mutating a material shared by providers. */
  resolveMode?(mode: SurfaceMode): Material;
  /** WGSL: vertex entry `vertex`, binding 0 frame, binding 1 parameters. */
  shader: string;
  parameters: Parameters;
  /** Fragment entry points, drawn in this order within this surface only. */
  passes: readonly string[];
  bounds: Readonly<{
    initial: number;
    max?: number;
    measure(width: number, height: number, budget: number): Insets;
  }>;
}>;
