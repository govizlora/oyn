import type { StaticData } from '../types/material.js';

/** Renderer-owned GPU copies, shared by payload identity. */
export function createStaticResources(device: GPUDevice) {
  const resources = new Map<StaticData, { buffer: GPUBuffer; refs: number }>();
  function retain(data: StaticData) {
    let entry = resources.get(data);
    if (!entry) {
      if (
        !data.bytes.byteLength ||
        data.bytes.byteLength % 4 ||
        data.bytes.byteLength > device.limits.maxStorageBufferBindingSize
      )
        throw Error('Invalid static material data size.');
      const buffer = device.createBuffer({
        size: data.bytes.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(buffer, 0, data.bytes);
      entry = { buffer, refs: 0 };
      resources.set(data, entry);
    }
    entry.refs++;
    return entry.buffer;
  }
  function drop(data?: StaticData) {
    if (!data) return;
    const entry = resources.get(data)!;
    if (--entry.refs === 0) {
      entry.buffer.destroy();
      resources.delete(data);
    }
  }
  return { retain, drop };
}
