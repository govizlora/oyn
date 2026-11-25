import type { MaterialInstance } from "./types/material.js";
import { createWebGPU } from "./webgpu.js";
export type Target = object;
export type Draw<T extends Target = Target> = {
  target: T;
  material: MaterialInstance;
  frame: Float32Array<ArrayBuffer>;
};
export interface Renderer {
  limit: number;
  ready?(material: MaterialInstance): boolean;
  createTarget(canvas: HTMLCanvasElement, material: MaterialInstance): Target;
  draw(items: Draw[]): void;
  release(target: Target): void;
  dispose(): void;
}
export async function createRenderer(
  fail: (error: unknown) => void,
  invalidate = () => {},
  hdr = false,
): Promise<Renderer> {
  let device: GPUDevice | undefined;
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    if (adapter)
      device = await adapter.requestDevice({
        requiredLimits: {
          maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
        },
      });
  } catch (error) {
    console.warn("WebGPU acquisition failed; trying WebGL2.", error);
  }
  if (device) return createWebGPU(device, fail, hdr);
  return (await import("./webgl2.js")).createWebGL2(fail, invalidate);
}
