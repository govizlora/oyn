import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const frozen = await readFile(
  new URL('./fixtures/ceramic-before-separation.wgsl', import.meta.url),
  'utf8',
);
const counts = (process.env.COUNTS ?? '100,300,500').split(',').map(Number);
const modes = (process.env.MODES ?? 'frozen,separated,solid-card').split(',');
const budget = Number(process.env.BUDGET ?? 40);
const out = process.env.REPORT_DIR ?? 'test-results/ceramic-scale';
const rounds = Number(process.env.ROUNDS ?? 2),
  sampleMs = Number(process.env.SAMPLE_MS ?? 1400);
const fixtureUrl = 'http://127.0.0.1:5197/tests/fixtures/surface.html';
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5197',
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
let browser;
const percentile = (a, p) =>
  a.length
    ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]
    : 0;
const summarize = (a) => ({
  p50: percentile(a, 0.5),
  p95: percentile(a, 0.95),
  max: Math.max(0, ...a),
});
const report = {
  method:
    'Headless Chrome, same varied card geometry, same fixed shadow budget. CPU includes browser API validation/encoding. queueDone is submit-to-completion wall latency, NOT pure GPU time. No timestamp queries. Mounted offscreen cards are included.',
  runs: [],
};
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(fixtureUrl)).ok) break;
    } catch {}
    if (i === 79) throw Error('Vite did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  report.browser = browser.version();
  const cdp = await browser.newBrowserCDPSession();
  const system = await cdp.send('SystemInfo.getInfo');
  report.gpu = system.gpu.devices;
  report.features = system.gpu.featureStatus;
  await mkdir(out, { recursive: true });
  const configurations = counts.map((count) => ({ count, dpr: 1 }));
  if (!process.env.COUNTS) configurations.push({ count: 300, dpr: 2 });
  for (let round = 0; round < rounds; round++)
    for (const config of configurations)
      for (const mode of round % 2 ? [...modes].reverse() : modes) {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 1000 },
          deviceScaleFactor: config.dpr,
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (m.type() === 'error') errors.push(m.text());
        });
        await page.goto(fixtureUrl);
        const raw = await page.evaluate(
          async ({ count, mode, frozen, sampleMs, budget }) => {
            const { createEngine } =
              await import('/packages/oyn/src/core/engine.ts');
            const { createCeramicMaterial } =
              await import('/packages/oyn/src/materials/ceramic/index.ts');
            const { solidCeramic } =
              await import('/tests/fixtures/runtime-solid.ts');
            const stats = {
              devices: 0,
              pipelines: 0,
              buffers: 0,
              bufferBytes: 0,
              submits: 0,
              draws: 0,
              passes: 0,
              uploadBytes: 0,
              writes: 0,
              measurements: 0,
            };
            let recording = false,
              frames = [],
              queueDone = [],
              device,
              queue;
            const patches = [];
            const patch = (proto, name, fn) => {
              const orig = proto[name];
              patches.push(() => (proto[name] = orig));
              proto[name] = function (...args) {
                return fn.call(this, orig, args);
              };
            };
            patch(
              GPUAdapter.prototype,
              'requestDevice',
              async function (orig, args) {
                stats.devices++;
                device = await orig.apply(this, args);
                return device;
              },
            );
            patch(
              GPUDevice.prototype,
              'createRenderPipeline',
              function (orig, args) {
                stats.pipelines++;
                return orig.apply(this, args);
              },
            );
            patch(GPUDevice.prototype, 'createBuffer', function (orig, args) {
              stats.buffers++;
              stats.bufferBytes += args[0].size;
              return orig.apply(this, args);
            });
            patch(GPUQueue.prototype, 'writeBuffer', function (orig, args) {
              stats.writes++;
              stats.uploadBytes += args[2].byteLength;
              return orig.apply(this, args);
            });
            patch(
              GPURenderPassEncoder.prototype,
              'draw',
              function (orig, args) {
                stats.draws++;
                return orig.apply(this, args);
              },
            );
            patch(
              GPUCommandEncoder.prototype,
              'beginRenderPass',
              function (orig, args) {
                stats.passes++;
                return orig.apply(this, args);
              },
            );
            patch(
              Element.prototype,
              'getBoundingClientRect',
              function (orig, args) {
                stats.measurements++;
                return orig.apply(this, args);
              },
            );
            patch(GPUQueue.prototype, 'submit', function (orig, args) {
              queue = this;
              stats.submits++;
              const start = performance.now();
              const result = orig.apply(this, args);
              if (recording) {
                const target = queueDone;
                this.onSubmittedWorkDone().then(() =>
                  target.push(performance.now() - start),
                );
              }
              return result;
            });
            const nativeRAF = requestAnimationFrame.bind(window);
            patch(window, 'requestAnimationFrame', function (orig, args) {
              return orig.call(this, (t) => {
                const start = performance.now(),
                  before = { ...stats };
                args[0](t);
                if (recording && stats.submits > before.submits)
                  frames.push({
                    t,
                    cpu: performance.now() - start,
                    draws: stats.draws - before.draws,
                    passes: stats.passes - before.passes,
                    writes: stats.writes - before.writes,
                    bytes: stats.uploadBytes - before.uploadBytes,
                    measurements: stats.measurements - before.measurements,
                  });
              });
            });
            const settle = async (n = 5) => {
              for (let i = 0; i < n; i++) await new Promise(nativeRAF);
            };
            const root = document.createElement('div');
            root.style.cssText =
              'display:grid;grid-template-columns:repeat(10,120px);gap:12px;align-items:start;padding:20px';
            document.body.append(root);
            const heightRange = Math.min(24, budget) - 7;
            const shape = (i, e = 8 + (i % heightRange)) => ({
              kind: 'card',
              center: [0, 0, e / 2],
              halfSize: [(96 + (i % 5) * 4) / 2, (52 + (i % 5) * 4) / 2, e / 2],
              radius: 4 + (i % 17),
              bevel: Math.min(3, e / 2),
            });
            const makeShape = (i, e = 8 + (i % heightRange)) => {
              const a = shape(i, e);
              if (mode !== 'solid-cut') return a;
              const radius = 12,
                depth = 2.5,
                R = (radius * radius + depth * depth) / (2 * depth);
              return {
                kind: 'subtract',
                a,
                b: {
                  kind: 'sphere',
                  center: [18, 0, e + R - depth],
                  radius: R,
                },
              };
            };
            const start = performance.now();
            const materials = [];
            const meshes = new Map();
            for (let i = 0; i < count; i++) {
              const width = 96 + (i % 5) * 4,
                height = 52 + (i % 5) * 4;
              const element = document.createElement('div');
              element.style.cssText = `width:${width}px;height:${height}px;border-radius:${4 + (i % 17)}px`;
              root.append(element);
              const rgb = [
                0.86 + (i % 11) * 0.01,
                0.87 + (i % 9) * 0.01,
                0.85 + (i % 13) * 0.01,
              ];
              const e = 8 + (i % heightRange);
              const legacy = mode.startsWith('solid')
                ? null
                : createCeramicMaterial({
                    colorScheme: 'light',
                    color: `rgb(${rgb.map((v) => v * 255).join(' ')})`,
                    elevation: e,
                    maxElevation: budget,
                  });
              const material = mode.startsWith('solid')
                ? solidCeramic(makeShape(i), {
                    extent: [width, height],
                    ceiling: budget,
                    color: rgb,
                  })
                : mode === 'frozen'
                  ? { ...legacy, shader: frozen }
                  : legacy;
              materials.push(material);
              meshes.set(element, { element, material });
            }
            const createMaterialsMs = performance.now() - start,
              failures = [];
            const engine = createEngine(meshes, (e) =>
              failures.push(String(e)),
            );
            try {
              for (let i = 0; stats.submits === 0 && !failures.length; i++) {
                if (i > 500) throw Error('Mount timeout');
                await new Promise(nativeRAF);
              }
              await queue.onSubmittedWorkDone();
              const mountedMs = performance.now() - start;
              await settle();
              if (failures.length) throw Error(failures.join('\n'));
              const canvasPixels = [...root.querySelectorAll('canvas')].reduce(
                (n, c) => n + c.width * c.height,
                0,
              );
              const initial = { ...stats },
                bufferBytes = stats.bufferBytes;
              const idleBefore = stats.submits;
              await new Promise((r) => setTimeout(r, 250));
              const idleSubmits = stats.submits - idleBefore;
              let tick = 0,
                active = true;
              const drive = () => {
                if (!active) return;
                tick++;
                window.dispatchEvent(
                  new PointerEvent('pointermove', {
                    clientX: 720 + Math.sin(tick * 0.13) * 600,
                    clientY: 450 + Math.cos(tick * 0.11) * 400,
                  }),
                );
                nativeRAF(drive);
              };
              drive();
              await new Promise((r) => setTimeout(r, 600));
              recording = true;
              const sampleStart = performance.now();
              await new Promise((r) => setTimeout(r, sampleMs));
              recording = false;
              active = false;
              await settle();
              await queue.onSubmittedWorkDone();
              const pointer = {
                frames,
                queueDone,
                duration: performance.now() - sampleStart,
              };
              frames = [];
              queueDone = [];
              // A local numeric update still uses the existing provider-wide invalidation path.
              recording = true;
              for (let i = 0; i < 20; i++) {
                if (mode.startsWith('solid'))
                  materials[0].setGeometry(makeShape(0, 8 + (i % heightRange)));
                else materials[0].setElevation(8 + (i % heightRange));
                await settle(2);
                await queue.onSubmittedWorkDone();
              }
              recording = false;
              const singleUpdate = { frames, queueDone };
              frames = [];
              queueDone = [];
              const allSetterMs = [];
              recording = true;
              for (let i = 0; i < 10; i++) {
                const started = performance.now();
                for (let j = 0; j < count; j++) {
                  if (mode.startsWith('solid'))
                    materials[j].setGeometry(
                      makeShape(j, 8 + ((i + j) % heightRange)),
                    );
                  else materials[j].setElevation(8 + ((i + j) % heightRange));
                }
                allSetterMs.push(performance.now() - started);
                await settle(2);
                await queue.onSubmittedWorkDone();
              }
              recording = false;
              const allUpdate = { frames, queueDone, setterMs: allSetterMs };
              const setterStart = performance.now();
              for (let i = 0; i < 1000; i++) {
                if (mode.startsWith('solid'))
                  materials[0].setGeometry(makeShape(0, 8 + (i % heightRange)));
                else materials[0].setElevation(8 + (i % heightRange));
              }
              const setter1000Ms = performance.now() - setterStart;
              await settle();
              await queue.onSubmittedWorkDone();
              return {
                createMaterialsMs,
                mountedMs,
                initial,
                bufferBytes,
                parameterBytes: materials[0].parameters.length * 4,
                canvasPixels,
                rgbaBytesLowerBound: canvasPixels * 4,
                idleSubmits,
                pointer,
                singleUpdate,
                allUpdate,
                setter1000Ms,
                failures,
                limits: {
                  maxUniformBufferBindingSize:
                    device.limits.maxUniformBufferBindingSize,
                },
              };
            } finally {
              engine.dispose();
              root.remove();
              patches.reverse().forEach((f) => f());
            }
          },
          { count: config.count, mode, frozen, sampleMs, budget },
        );
        assert.deepEqual(errors, []);
        assert.deepEqual(raw.failures, []);
        assert.equal(raw.initial.devices, 1);
        assert.equal(raw.initial.pipelines, 2);
        assert.equal(raw.idleSubmits, 0);
        for (const f of raw.pointer.frames) {
          assert.equal(f.draws, config.count * 2);
          assert.equal(f.passes, config.count);
          assert.equal(f.writes, config.count * 2);
        }
        const f = raw.pointer.frames,
          intervals = f.slice(1).map((v, i) => v.t - f[i].t);
        const run = {
          round,
          ...config,
          budget,
          mode,
          setupMs: raw.createMaterialsMs,
          mountedMs: raw.mountedMs,
          parameterBytes: raw.parameterBytes,
          bufferBytes: raw.bufferBytes,
          canvasPixels: raw.canvasPixels,
          rgbaMiBLowerBound: raw.rgbaBytesLowerBound / 1048576,
          idleSubmits: raw.idleSubmits,
          pipelines: raw.initial.pipelines,
          frames: f.length,
          fps:
            f.length > 1 ? ((f.length - 1) * 1000) / (f.at(-1).t - f[0].t) : 0,
          cpuMs: summarize(f.map((v) => v.cpu)),
          intervalMs: summarize(intervals),
          queueDoneMs: summarize(raw.pointer.queueDone),
          uploadBytesPerFrame: f[0]?.bytes,
          drawsPerFrame: f[0]?.draws,
          singleUpdateCpuMs: summarize(
            raw.singleUpdate.frames.map((v) => v.cpu),
          ),
          singleUpdateDraws: raw.singleUpdate.frames[0]?.draws,
          setter1000Ms: raw.setter1000Ms,
          allUpdateSetterMs: summarize(raw.allUpdate.setterMs),
          allUpdateCpuMs: summarize(raw.allUpdate.frames.map((v) => v.cpu)),
        };
        report.runs.push(run);
        console.log(JSON.stringify(run));
        await writeFile(
          `${out}/raw-${round}-${mode}-${config.count}-${config.dpr}.json`,
          JSON.stringify(raw),
        );
        await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
        await page.close();
      }
} finally {
  await browser?.close();
  server.kill();
}
