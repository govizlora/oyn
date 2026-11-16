/// <reference types="@webgpu/types" />
import type { Material } from './material.js';

export type Target = { context: GPUCanvasContext; frame: GPUBuffer; parameters: GPUBuffer; bind: GPUBindGroup; pipelines: GPURenderPipeline[]; size: number };
/** One device per Provider; no DOM ancestry, geometry inference or animation policy. */
export async function createRenderer(fail: (error: unknown) => void) {
  if (!navigator.gpu) throw Error('Surface requires WebGPU on HTTPS/localhost. No fallback is installed.');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('Surface WebGPU adapter unavailable.');
  const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: adapter.limits.maxTextureDimension2D } });
  let disposed = false;
  device.lost.then(info => { if (!disposed) fail(Error(`Surface GPU device lost: ${info.message}`)); });
  device.addEventListener('uncapturederror', event => { if (!disposed) fail(event.error); });
  const format = navigator.gpu.getPreferredCanvasFormat();
  const layout = device.createBindGroupLayout({ entries: [0, 1].map(binding => ({ binding, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' as const } })) });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const cache = new Map<string, GPURenderPipeline[]>();
  const targets = new Set<Target>();
  function pipelines(material: Material) {
    const key = JSON.stringify([material.shader, material.passes]);
    let result = cache.get(key);
    if (!result) {
      if (!material.passes.length) throw Error('Material requires at least one fragment pass.');
      const module = device.createShaderModule({ code: material.shader });
      result = material.passes.map(entryPoint => device.createRenderPipeline({ layout: pipelineLayout,
        vertex: { module, entryPoint: 'vertex' }, primitive: { topology: 'triangle-list' },
        fragment: { module, entryPoint, targets: [{ format, blend: {
          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
        } }] },
      }));
      cache.set(key, result);
    }
    return result;
  }
  function createTarget(canvas: HTMLCanvasElement, material: Material): Target {
    const context = canvas.getContext('webgpu');
    if (!context) throw Error('Surface WebGPU canvas unavailable.');
    const programs = pipelines(material);
    const size = material.parameters.length * 4;
    if (size > device.limits.maxUniformBufferBindingSize) throw Error('Material parameter block exceeds GPU limit.');
    const frame = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const parameters = device.createBuffer({ size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const bind = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: frame } }, { binding: 1, resource: { buffer: parameters } }] });
    const target = { context, frame, parameters, bind, pipelines: programs, size };
    targets.add(target);
    context.configure({ device, format, alphaMode: 'premultiplied' });
    return target;
  }
  function release(target: Target) {
    target.context.unconfigure(); target.frame.destroy(); target.parameters.destroy(); targets.delete(target);
  }
  function draw(items: { target: Target; material: Material; frame: Float32Array<ArrayBuffer> }[]) {
    if (!items.length || disposed) return;
    const encoder = device.createCommandEncoder();
    for (const { target, material, frame } of items) {
      device.queue.writeBuffer(target.frame, 0, frame);
      device.queue.writeBuffer(target.parameters, 0, material.parameters.snapshot());
      const pass = encoder.beginRenderPass({ colorAttachments: [{ view: target.context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
      pass.setBindGroup(0, target.bind);
      for (const pipeline of target.pipelines) { pass.setPipeline(pipeline); pass.draw(6); }
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
  }
  function dispose() { if (disposed) return; disposed = true; targets.forEach(release); cache.clear(); device.destroy(); }
  return { createTarget, release, draw, dispose, limit: device.limits.maxTextureDimension2D };
}
export type Renderer = Awaited<ReturnType<typeof createRenderer>>;
