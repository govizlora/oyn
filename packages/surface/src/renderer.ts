/// <reference types="@webgpu/types" />
import type { Material, StaticData } from './types/material.js';
import type { Target } from './gpu/Target.js';
import { createLayouts } from './gpu/createLayouts.js';
import { createPipelineCache } from './gpu/createPipelineCache.js';
import { createStaticResources } from './gpu/createStaticResources.js';
export type { Target } from './gpu/Target.js';

/** One device per Provider; no DOM ancestry, geometry inference or animation policy. */
export async function createRenderer(fail: (error: unknown) => void) {
  if (!navigator.gpu)
    throw Error(
      'Surface requires WebGPU on HTTPS/localhost. No fallback is installed.',
    );
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('Surface WebGPU adapter unavailable.');
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
    },
  });
  let disposed = false;
  device.lost.then((info) => {
    if (!disposed) fail(Error(`Surface GPU device lost: ${info.message}`));
  });
  device.addEventListener('uncapturederror', (event) => {
    if (!disposed) fail(event.error);
  });
  const format = navigator.gpu.getPreferredCanvasFormat();
  const layouts = createLayouts(device);
  const { layout, dataLayout } = layouts;
  const { retain, drop } = createStaticResources(device);
  function binding(frame: GPUBuffer, parameters: GPUBuffer, data?: StaticData) {
    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: frame } },
      { binding: 1, resource: { buffer: parameters } },
    ];
    if (data) entries.push({ binding: 2, resource: { buffer: retain(data) } });
    return device.createBindGroup({
      layout: data ? dataLayout : layout,
      entries,
    });
  }
  const cache = createPipelineCache(device, format, layouts);
  const targets = new Set<Target>();
  function createTarget(canvas: HTMLCanvasElement, material: Material): Target {
    const context = canvas.getContext('webgpu');
    if (!context) throw Error('Surface WebGPU canvas unavailable.');
    const programs = cache.get(material);
    const size = material.parameters.length * 4;
    if (size > device.limits.maxUniformBufferBindingSize)
      throw Error('Material parameter block exceeds GPU limit.');
    const frame = device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const parameters = device.createBuffer({
      size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bind = binding(frame, parameters, material.data);
    const target = {
      context,
      frame,
      parameters,
      bind,
      pipelines: programs,
      size,
      shader: material.shader,
      passes: material.passes,
      data: material.data,
    };
    targets.add(target);
    context.configure({ device, format, alphaMode: 'premultiplied' });
    return target;
  }
  function release(target: Target) {
    drop(target.data);
    target.context.unconfigure();
    target.frame.destroy();
    target.parameters.destroy();
    targets.delete(target);
  }
  function draw(
    items: {
      target: Target;
      material: Material;
      frame: Float32Array<ArrayBuffer>;
    }[],
  ) {
    if (!items.length || disposed) return;
    const encoder = device.createCommandEncoder();
    for (const { target, material, frame } of items) {
      if (
        target.shader !== material.shader ||
        target.passes !== material.passes ||
        !!target.data !== !!material.data
      ) {
        target.pipelines = cache.get(material);
        target.shader = material.shader;
        target.passes = material.passes;
      }
      if (target.data !== material.data) {
        const bind = binding(target.frame, target.parameters, material.data);
        drop(target.data);
        target.data = material.data;
        target.bind = bind;
      }
      if (
        !target.uploadedFrame ||
        frame.some((value, index) => value !== target.uploadedFrame![index])
      ) {
        device.queue.writeBuffer(target.frame, 0, frame);
        if (target.uploadedFrame) target.uploadedFrame.set(frame);
        else target.uploadedFrame = frame.slice();
      }
      if (
        target.uploadedParameters !== material.parameters ||
        target.uploadedVersion !== material.parameters.version
      ) {
        device.queue.writeBuffer(
          target.parameters,
          0,
          material.parameters.snapshot(),
        );
        target.uploadedParameters = material.parameters;
        target.uploadedVersion = material.parameters.version;
      }
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: target.context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: [0, 0, 0, 0],
          },
        ],
      });
      pass.setBindGroup(0, target.bind);
      for (const pipeline of target.pipelines) {
        pass.setPipeline(pipeline);
        pass.draw(6);
      }
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    targets.forEach(release);
    cache.clear();
    device.destroy();
  }
  return {
    createTarget,
    release,
    draw,
    dispose,
    limit: device.limits.maxTextureDimension2D,
  };
}
export type Renderer = Awaited<ReturnType<typeof createRenderer>>;
