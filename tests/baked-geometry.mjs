import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { bake } from '../tools/geometry/bake.mjs';
import { specimens } from '../tools/geometry/recipes.mjs';
import { decodeGeometry, bakedCeramic } from '@oyn/ceramic/baked';
const shape = specimens[0].geometry(40, true),
  bytes = bake(shape);
assert.deepEqual(
  bytes,
  await readFile('examples/atelier/public/geometries/0-40.bin'),
  'Generated asset is reproducible',
);
assert.deepEqual(
  bake({ kind: 'union', a: shape, b: shape }),
  bytes,
  'Equivalent trees produce identical geometry',
);
const buffer = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);
const geometry = decodeGeometry(buffer),
  material = bakedCeramic(geometry, { colorScheme: 'light' });
assert.equal(material.parameters.length, 44);
assert.equal(
  bakedCeramic(geometry).data,
  material.data,
  'Instances share immutable data identity',
);
assert.throws(() => decodeGeometry(new ArrayBuffer(36)));
assert.ok(
  !material.shader.includes('fn geometry(') &&
    !material.shader.includes('raymarch'),
);
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5199',
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
const stress = process.env.BAKED_STRESS === '1';
const surfaceCount = stress ? 100 : 3;
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5199')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto('http://127.0.0.1:5199/tests/fixtures/surface.html');
  const result = await page.evaluate(
    async ({ surfaceCount, stress }) => {
      const { decodeGeometry, bakedCeramic } = await import(
        '/packages/ceramic/src/baked.ts'
      );
      const { createEngine } = await import('/packages/surface/src/engine.ts');
      const geometry = decodeGeometry(
        await (
          await fetch('/examples/atelier/public/geometries/0-40.bin')
        ).arrayBuffer(),
      );
      const stats = {
        storageCreated: 0,
        storageWrites: 0,
        storageDestroyed: 0,
        pipelines: 0,
        submits: 0,
      };
      const storage = new Set();
      const create = GPUDevice.prototype.createBuffer,
        write = GPUQueue.prototype.writeBuffer,
        destroy = GPUBuffer.prototype.destroy,
        pipeline = GPUDevice.prototype.createRenderPipeline,
        submit = GPUQueue.prototype.submit;
      GPUDevice.prototype.createBuffer = function (d) {
        const b = create.call(this, d);
        if (d.usage & GPUBufferUsage.STORAGE) {
          storage.add(b);
          stats.storageCreated++;
        }
        return b;
      };
      GPUQueue.prototype.writeBuffer = function (b, ...args) {
        if (storage.has(b)) stats.storageWrites++;
        return write.call(this, b, ...args);
      };
      GPUBuffer.prototype.destroy = function () {
        if (storage.delete(this)) stats.storageDestroyed++;
        return destroy.call(this);
      };
      GPUDevice.prototype.createRenderPipeline = function (d) {
        stats.pipelines++;
        return pipeline.call(this, d);
      };
      GPUQueue.prototype.submit = function (d) {
        stats.submits++;
        return submit.call(this, d);
      };
      const root = document.createElement('div');
      root.style.cssText =
        'display:grid;grid-template-columns:repeat(10,100px);gap:10px';
      document.body.append(root);
      const meshes = new Map();
      for (let i = 0; i < surfaceCount; i++) {
        const element = document.createElement('div');
        element.style.cssText = 'width:100px;height:70px';
        root.append(element);
        meshes.set(element, {
          element,
          material: bakedCeramic(geometry, { colorScheme: 'light' }),
        });
      }
      const errors = [],
        engine = createEngine(meshes, (e) => errors.push(String(e)));
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const settle = async () => {
        for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
      };
      try {
        for (
          let i = 0;
          i < 200 &&
          root.querySelectorAll('canvas').length !== surfaceCount &&
          !errors.length;
          i++
        )
          await sleep(25);
        await settle();
        const idle = stats.submits;
        await settle();
        const idleSubmits = stats.submits - idle;
        let fps;
        if (stress) {
          let frames = 0,
            start = performance.now();
          while (performance.now() - start < 1800) {
            window.dispatchEvent(
              new PointerEvent('pointermove', {
                clientX: 400 + Math.sin(frames * 0.1) * 300,
                clientY: 200,
              }),
            );
            await new Promise(requestAnimationFrame);
            frames++;
          }
          fps = (frames * 1000) / (performance.now() - start);
        } else {
          // Exercise a redraw without a timed performance workload.
          window.dispatchEvent(
            new PointerEvent('pointermove', { clientX: 400, clientY: 200 }),
          );
          await settle();
        }
        const mounted = root.querySelectorAll('canvas').length;
        // Remove one owner: the shared resource must survive the remaining owners.
        const first = meshes.keys().next().value;
        meshes.delete(first);
        first.remove();
        engine.invalidate();
        await settle();
        const destroyedWhileShared = stats.storageDestroyed;
        engine.dispose();
        return {
          mounted,
          idleSubmits,
          destroyedWhileShared,
          ...(stress ? { fps } : {}),
          ...stats,
          errors,
        };
      } finally {
        engine.dispose();
        root.remove();
      }
    },
    { surfaceCount, stress },
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.mounted, surfaceCount);
  assert.equal(result.storageCreated, 1);
  assert.equal(result.storageWrites, 1);
  assert.equal(result.storageDestroyed, 1);
  assert.equal(result.destroyedWhileShared, 0);
  assert.equal(result.pipelines, 2);
  assert.equal(result.idleSubmits, 0);
  await mkdir('test-results/baked', { recursive: true });
  await writeFile(
    'test-results/baked/report.json',
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await browser?.close();
  server.kill();
}
