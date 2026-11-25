import type { MaterialInstance } from '../types/material.js';
import type { createLayouts } from './createLayouts.js';

/** One cache per renderer; visual parameter values are not pipeline keys. */
export function createPipelineCache(
  device: GPUDevice,
  format: GPUTextureFormat,
  layouts: ReturnType<typeof createLayouts>,
) {
  const { pipelineLayout, dataPipelineLayout } = layouts;
  const cache = new Map<string, GPURenderPipeline[]>();
  function pipelines(material: MaterialInstance) {
    const key = JSON.stringify([
      material.shader,
      material.passes,
      !!material.data,
    ]);
    let result = cache.get(key);
    if (!result) {
      if (!material.passes.length)
        throw Error('MaterialInstance requires at least one fragment pass.');
      const module = device.createShaderModule({ code: material.shader });
      result = material.passes.map((entryPoint) =>
        device.createRenderPipeline({
          layout: material.data ? dataPipelineLayout : pipelineLayout,
          vertex: { module, entryPoint: 'vertex' },
          primitive: { topology: 'triangle-list' },
          fragment: {
            module,
            entryPoint,
            targets: [
              {
                format,
                blend: {
                  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                },
              },
            ],
          },
        }),
      );
      cache.set(key, result);
    }
    return result;
  }
  return { get: pipelines, clear: () => cache.clear() };
}
