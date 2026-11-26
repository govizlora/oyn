/// <reference types="@webgpu/types" />

/** Shared binding layouts for the renderer, with or without static data. */
export function createLayouts(device: GPUDevice) {
  const layout = device.createBindGroupLayout({
    entries: [0, 1].map((binding) => ({
      binding,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: 'uniform' as const },
    })),
  });
  const dataLayout = device.createBindGroupLayout({
    entries: [
      ...[0, 1].map((binding) => ({
        binding,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' as const },
      })),
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'read-only-storage' },
      },
    ],
  });
  const dataPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [dataLayout],
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [layout],
  });
  return { layout, dataLayout, pipelineLayout, dataPipelineLayout };
}
