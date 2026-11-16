import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { chromium, firefox } from 'playwright';
import { spawn } from 'node:child_process';
import { createParameters } from '../packages/surface/dist/material.js';
import { bindMotion } from '../packages/surface/dist/adapters/motion.js';
import { ceramic, ceramicDefaults } from '../packages/material-ceramic/dist/index.js';
import { shadowBounds } from '../packages/material-ceramic/dist/bounds.js';

assert.equal(ceramicDefaults.elevation, 16);
assert.equal(ceramic().parameters.get(1), 16);
assert.equal('surfaceHeight' in ceramicDefaults, false);
const tuned = ceramic({ shadowLightHeight: 300, shadowLightSize: 400, shadowStrength: 0.2,
  contactShadowStrength: 0.04, lightZ: 40, reflectionStrength: 2, sharpness: 2,
  darkFrost: 0.3, lightReflectionStrength: 1, lightReflectionSpread: 0.5,
  lightEdgeShade: 0.1, lightSurfaceTop: 0.3, lightSurfaceShade: 0.02, lightRim: 5 });
assert.deepEqual([...tuned.parameters.snapshot().slice(12)], [...new Float32Array([
  300,400,0.2,0.04,40,2,2,0.3,1,0.5,0.1,0,0.3,0.02,0,0])]);
assert.equal(tuned.parameters.get(2), 5);
assert.ok(tuned.bounds.measure(320,100,16).x > ceramic().bounds.measure(320,100,16).x);
assert.throws(() => ceramic({ shadowLightHeight: 10 }));
assert.throws(() => ceramic({ lightReflectionSpread: 2 }));
assert.throws(() => ceramic({ lightSurface: 256 }));
assert.deepEqual([...ceramic({ lightSurface: 220 }).parameters.snapshot().slice(4,7)], [...new Float32Array([220/255,220/255,220/255])]);

const block = createParameters([0, 0, 0, 0]);
let notices = 0; const off = block.subscribe(() => notices++);
block.set(0, 1); block.set(0, 1); off(); block.set(0, 2); assert.equal(notices, 1);
assert.throws(() => block.set(4, 1)); assert.throws(() => block.set(0, Infinity));
const copy = block.snapshot(); copy[0] = 100; assert.equal(block.get(0), 2);
let listener; let detached = false;
const material = ceramic({ elevation: 12, maxElevation: 18 });
const unbind = bindMotion({ get: () => 10, on: (event, fn) => { assert.equal(event, 'change'); listener = fn; return () => { detached = true; }; } }, material.setElevation);
assert.equal(material.parameters.get(1), 10); listener(3); assert.equal(material.parameters.get(1), 3); unbind(); assert.ok(detached);
for (const elevation of [-1, NaN, Infinity, 480]) assert.throws(() => ceramic({ elevation }));
assert.ok(shadowBounds(1200, 100, 12).x > shadowBounds(120, 100, 12).x);
assert.deepEqual(shadowBounds(120, 40, 0), { x: 2, y: 2 });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { stdio: 'pipe' });
let serverOutput = ''; server.stderr.on('data', chunk => serverOutput += chunk);
const base = 'http://127.0.0.1:5189';
let browser;
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (i > 100) throw Error('Vite did not start: ' + serverOutput);
    await new Promise(r => setTimeout(r, 100));
  }
  browser = process.env.BROWSER === 'firefox' ? await firefox.launch({ headless: true }) : await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(base + '/tests/fixtures/surface.html');
  const result = await page.evaluate(async () => {
    const { createEngine } = await import('/packages/surface/src/engine.ts');
    const { ceramic } = await import('/packages/material-ceramic/src/index.ts');
    const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame); };
    const wait = async condition => { for (let i = 0; !condition(); i++) { if (i > 300) throw Error('Timed out waiting for GPU canvas'); await new Promise(requestAnimationFrame); } };
    let devices = 0, submits = 0, pipelines = 0, copies = 0, measurements = 0, scheduled = 0;
    const originals = [];
    function count(proto, method, increment) { const original = proto[method]; originals.push(() => proto[method] = original); proto[method] = function(...args) { increment(); return original.apply(this, args); }; }
    count(window, 'requestAnimationFrame', () => scheduled++);
    count(Element.prototype, 'getBoundingClientRect', () => measurements++);
    count(GPUAdapter.prototype, 'requestDevice', () => devices++);
    count(GPUQueue.prototype, 'submit', () => submits++);
    count(GPUDevice.prototype, 'createRenderPipeline', () => pipelines++);
    count(CanvasRenderingContext2D.prototype, 'drawImage', () => copies++);
    const hosts = Array.from({ length: 3 }, () => { const el = document.createElement('div'); el.style.cssText = 'width:120px;height:40px;border-radius:8px'; document.body.append(el); return el; });
    const materials = hosts.map(() => ceramic({ elevation: 12 }));
    const meshes = new Map(hosts.map((element, i) => [element, { element, material: materials[i], initialBudget: materials[i].bounds.initial }]));
    const failures = []; const engine = createEngine(meshes, e => failures.push(String(e)));
    try {
      await wait(() => failures.length || document.querySelectorAll('[data-oyn-canvas]').length === 3);
      await settle();
      if (failures.length) throw Error(failures.join('\n'));
      const canvases = hosts.map(h => h.querySelector('canvas'));
      const initial = canvases.map(c => [c.width, c.height]);
      const firstPipelines = pipelines;
      const before = scheduled, measuredBefore = measurements;
      for (let i = 0; i < 30; i++) materials[0].setElevation(i / 10);
      const animationSchedules = scheduled - before;
      const noAnimationMeasurement = measuredBefore === measurements;
      await settle();
      const stable = canvases.every((c, i) => c.width === initial[i][0] && c.height === initial[i][1]);
      // Material replacement must not reset the binding's initial budget.
      meshes.get(hosts[0]).material = ceramic({ elevation: 2, mode: 'dark' }); engine.invalidate(); await settle();
      const replacementStable = canvases[0].width === initial[0][0];
      meshes.get(hosts[0]).material = ceramic({ elevation: 2, maxElevation: 24 }); engine.invalidate(); await settle();
      const explicitGrowth = canvases[0].width > initial[0][0];
      hosts[1].style.width = '240px'; await settle();
      const resized = canvases[1].width > initial[1][0] && hosts[1].querySelector('canvas') === canvases[1];
      const beforeOld = scheduled; materials[0].setElevation(7);
      const oldUnsubscribed = scheduled === beforeOld;
      await settle();
      const unchangedPipelines = pipelines === firstPipelines;
      const baselineCopies = copies;
      engine.dispose(); await settle();
      const cleaned = hosts.every(h => !h.querySelector('canvas') && h.style.position === '' && h.style.isolation === '');
      return { devices, firstPipelines, unchangedPipelines, animationSchedules, noAnimationMeasurement, stable, replacementStable, explicitGrowth, resized, oldUnsubscribed, copies: baselineCopies, cleaned, failures };
    } finally { engine.dispose(); hosts.forEach(h => h.remove()); originals.forEach(fn => fn()); }
  });
  assert.equal(result.devices, 1); assert.equal(result.firstPipelines, 2); assert.ok(result.unchangedPipelines);
  assert.equal(result.animationSchedules, 1); assert.equal(result.copies, 0);
  for (const key of ['noAnimationMeasurement', 'stable', 'replacementStable', 'explicitGrowth', 'resized', 'oldUnsubscribed', 'cleaned']) assert.ok(result[key], key);
  assert.deepEqual(result.failures, []);
  const refs = await page.evaluate(async () => (await import('/tests/fixtures/surface-refs.tsx')).checkRefLifecycle());
  assert.equal(refs.firstCanvases, 1);
  for (const key of ['stableOnMaterialChange', 'oldRefCleaned', 'newRefCleaned', 'objectAttached', 'objectCleared', 'noCanvases']) assert.ok(refs[key], key);
  await page.evaluate(async () => {
    const { createEngine } = await import('/packages/surface/src/engine.ts');
    const { ceramic } = await import('/packages/material-ceramic/src/index.ts');
    document.body.style.background = '#808080';
    const element = document.createElement('div');
    element.style.cssText = 'position:absolute;left:100px;top:100px;width:160px;height:100px;border-radius:12px';
    document.body.append(element);
    const material = ceramic({ mode: 'dark', elevation: 12 });
    const meshes = new Map([[element, { element, material, initialBudget: 12 }]]);
    window.visual = { material, element, meshes, engine: createEngine(meshes) };
  });
  await page.waitForSelector('[data-oyn-canvas]');
  await page.waitForTimeout(200);
  const png = PNG.sync.read(await page.screenshot({path:'/tmp/oyn-package.png'}));
  const pixel = (x,y) => [...png.data.slice((y*png.width+x)*4,(y*png.width+x)*4+4)];
  assert.deepEqual(pixel(180,150), [12,12,12,255], 'dark material paints its DOM-aligned center');
  assert.deepEqual(pixel(50,50), [128,128,128,255]);
  await page.evaluate(async () => {
    const { ceramic } = await import('/packages/material-ceramic/src/index.ts');
    window.visual.meshes.get(window.visual.element).material = ceramic({ elevation: 12 });
    window.visual.engine.invalidate();
  });
  await page.waitForTimeout(100);
  const light = PNG.sync.read(await page.screenshot());
  assert.ok(light.data[(150 * light.width + 180) * 4] >= 235, 'light material repaints without pipeline state leaking');
  await page.evaluate(() => { window.visual.engine.dispose(); window.visual.element.remove(); });
  const failureChecks = await page.evaluate(async () => {
    const { createRenderer } = await import('/packages/surface/src/renderer.ts');
    const { createEngine } = await import('/packages/surface/src/engine.ts');
    const { ceramic } = await import('/packages/material-ceramic/src/index.ts');
    const own = Object.getOwnPropertyDescriptor(navigator, 'gpu');
    let unavailable = false;
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    try { await createRenderer(() => {}); } catch (error) { unavailable = error.message.includes('WebGPU'); }
    finally { if (own) Object.defineProperty(navigator, 'gpu', own); else delete navigator.gpu; }
    const wait = async predicate => { for (let i = 0; !predicate(); i++) { if (i > 300) throw Error('Failure cleanup timed out'); await new Promise(requestAnimationFrame); } };
    const host = document.createElement('div'); host.style.cssText = 'width:100000px;height:10px'; document.body.append(host);
    const material = ceramic(); const mesh = { element: host, material, initialBudget: 12 };
    const failures = []; const engine = createEngine(new Map([[host, mesh]]), e => failures.push(String(e)));
    await wait(() => failures.length);
    const oversized = failures[0].includes('exceeds GPU limit') && !host.querySelector('canvas'); engine.dispose(); host.remove();
    let device;
    const request = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function(...args) { device = await request.apply(this, args); return device; };
    const el = document.createElement('div'); el.style.cssText = 'width:100px;height:40px'; document.body.append(el);
    const lost = [];
    const lossEngine = createEngine(new Map([[el, { element: el, material, initialBudget: 12 }]]), e => lost.push(String(e)));
    try {
      await wait(() => el.querySelector('canvas'));
      device.destroy(); await wait(() => lost.length);
      const lossCleaned = !el.querySelector('canvas') && lost[0].includes('device lost');
      return { unavailable, oversized, lossCleaned };
    } finally { lossEngine.dispose(); el.remove(); GPUAdapter.prototype.requestDevice = request; }
  });
  assert.ok(failureChecks.unavailable && failureChecks.oversized && failureChecks.lossCleaned, JSON.stringify(failureChecks));
  assert.deepEqual(errors, []);
  console.log('PASS: WebGPU packages, shared device/pipelines, independent canvases, numeric updates, explicit Motion adapter, frozen budgets, resize, material replacement, cleanup and StrictMode refs.');
} finally { await browser?.close(); server.kill(); }
