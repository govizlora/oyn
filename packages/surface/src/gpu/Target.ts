import type { StaticData, Parameters } from '../types/material.js';

export type Target = {
  context: GPUCanvasContext;
  frame: GPUBuffer;
  parameters: GPUBuffer;
  bind: GPUBindGroup;
  pipelines: GPURenderPipeline[];
  shader: string;
  passes: readonly string[];
  data?: StaticData;
  uploadedParameters?: Parameters;
  uploadedVersion?: number;
  uploadedFrame?: Float32Array<ArrayBuffer>;
};
