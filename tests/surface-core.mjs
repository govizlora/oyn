import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { chromium, firefox } from 'playwright';
import { spawn } from 'node:child_process';
import { createParameters } from '../packages/oyn/dist/index.js';
import { bindMotion } from '../packages/oyn/dist/core/adapters/motion.js';
import { createCeramicMaterial, ceramicDefaults, ceramic } from '../packages/oyn/dist/materials/ceramic/index.js';
import { shadowBounds } from '../packages/oyn/dist/materials/ceramic/bounds.js';

assert.equal(ceramicDefaults.elevation, 16);
assert.equal(createCeramicMaterial().parameters.get(1), 16);
assert.equal('surfaceHeight' in ceramicDefaults, false);
// Padding policy belongs to the appearance, including remeasurement after updates.
const appearance = ceramic.create({ elevation: 16, colorScheme: 'light' });
const reservedPadding = appearance.material.measurePadding(120, 40);
appearance.update({ elevation: 32, colorScheme: 'dark' });
assert.deepEqual(appearance.material.measurePadding(120, 40), { x: 10, y: 10 }); // glow budget for the initial 16px height
appearance.update({ elevation: 8, maxElevation: 40, colorScheme: 'light' });
assert.ok(appearance.material.measurePadding(120, 40).x > reservedPadding.x);
appearance.update({ elevation: 8, colorScheme: 'light' });
assert.deepEqual(appearance.material.measurePadding(120, 40), reservedPadding);
appearance.dispose?.();

const tuned = createCeramicMaterial({ shadowLightHeight: 300, shadowLightSize: 400, shadowStrength: 0.2,
  contactShadowStrength: 0.04, lightZ: 40, reflectionStrength: 2, sharpness: 2,
  darkFrost: 0.3, lightReflectionStrength: 1, lightReflectionSpread: 0.5,
  lightEdgeShade: 0.1, lightSurfaceTop: 0.3, lightSurfaceShade: 0.02, lightRim: 5 });
assert.deepEqual([...tuned.parameters.snapshot().slice(12)], [...new Float32Array([
  300,400,0.2,0.04,40,2,2,0.3,1,0.5,0.1,0,0.3,0.02,0,2])]);
assert.equal(tuned.parameters.get(2), 5);
assert.ok(tuned.measurePadding(320,100).x > createCeramicMaterial().measurePadding(320,100).x);
assert.throws(() => createCeramicMaterial({ shadowLightHeight: 10 }));
assert.throws(() => createCeramicMaterial({ lightReflectionSpread: 2 }));
assert.throws(() => createCeramicMaterial({ color: 'rgb(256 256 256)' }));
assert.deepEqual([...createCeramicMaterial({ color: 'rgb(220 220 220)' }).parameters.snapshot().slice(4,7)], [...new Float32Array([220/255,220/255,220/255])]);

const block = createParameters([0, 0, 0, 0]);
let notices = 0; const off = block.subscribe(() => notices++);
block.set(0, 1); block.set(0, 1); off(); block.set(0, 2); assert.equal(notices, 1);
assert.throws(() => block.set(4, 1)); assert.throws(() => block.set(0, Infinity));
const copy = block.snapshot(); copy[0] = 100; assert.equal(block.get(0), 2);
let listener; let detached = false;
const material = createCeramicMaterial({ elevation: 12, maxElevation: 18 });
const unbind = bindMotion({ get: () => 10, on: (event, fn) => { assert.equal(event, 'change'); listener = fn; return () => { detached = true; }; } }, material.setElevation);
assert.equal(material.parameters.get(1), 10); listener(3); assert.equal(material.parameters.get(1), 3); unbind(); assert.ok(detached);
for (const elevation of [NaN, Infinity, -Infinity, 480]) assert.throws(() => createCeramicMaterial({ elevation }));
assert.ok(shadowBounds(1200, 100, 12).x > shadowBounds(120, 100, 12).x);
assert.deepEqual(shadowBounds(120, 40, 0), { x: 2, y: 2 });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { stdio: 'pipe' });
let serverOutput = ''; server.stderr.on('data', chunk => serverOutput += chunk);
const fixtureUrl = 'http://127.0.0.1:5189/tests/fixtures/surface.html';
let browser;
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(fixtureUrl)).ok) break; } catch {}
    if (i > 100) throw Error('Vite did not start: ' + serverOutput);
    await new Promise(r => setTimeout(r, 100));
  }
  browser = process.env.BROWSER === 'firefox' ? await firefox.launch({ headless: true }) : await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(fixtureUrl);
  const result = await page.evaluate(async () => {
    const { createEngine } = await import('/packages/oyn/src/core/engine.ts');
    const { createCeramicMaterial } = await import('/packages/oyn/src/materials/ceramic/index.ts');
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
    const materials = hosts.map(() => createCeramicMaterial({ elevation: 12 }));
    const engine = createEngine();
    const meshes = engine.entries;
    hosts.forEach((element, i) => meshes.set(element, { element, material: materials[i] }));
    engine.start();
    try {
      await wait(() => engine.failed || document.querySelectorAll('[data-oyn-canvas]').length === 3);
      await settle();
      if (engine.failed) throw Error('Surface engine failed');
      const canvases = hosts.map(h => h.querySelector('canvas'));
      const initial = canvases.map(c => [c.width, c.height]);
      const firstPipelines = pipelines;
      const before = scheduled, measuredBefore = measurements;
      for (let i = 0; i < 30; i++) materials[0].setElevation(i / 10);
      const animationSchedules = scheduled - before;
      const noAnimationMeasurement = measuredBefore === measurements;
      await settle();
      const stable = canvases.every((c, i) => c.width === initial[i][0] && c.height === initial[i][1]);
      // A replacement material owns its own padding policy.
      meshes.get(hosts[0]).material = createCeramicMaterial({ elevation: 2, colorScheme: 'dark' }); engine.requestMeasure(); await settle();
      const replacementPaddingChanged = canvases[0].width < initial[0][0];
      meshes.get(hosts[0]).material = createCeramicMaterial({ elevation: 2, maxElevation: 24 }); engine.requestMeasure(); await settle();
      const explicitGrowth = canvases[0].width > initial[0][0];
      hosts[1].style.width = '240px'; await settle();
      const resized = canvases[1].width > initial[1][0] && hosts[1].querySelector('canvas') === canvases[1];
      const beforeOld = scheduled; materials[0].setElevation(7);
      const oldUnsubscribed = scheduled === beforeOld;
      await settle();
      const unchangedPipelines = pipelines === firstPipelines; // Signed relief and both themes share one surface program.
      const baselineCopies = copies;
      engine.stop(); await settle();
      const cleaned = hosts.every(h => !h.querySelector('canvas') && h.style.position === '' && h.style.isolation === '');
      return { devices, firstPipelines, unchangedPipelines, animationSchedules, noAnimationMeasurement, stable, replacementPaddingChanged, explicitGrowth, resized, oldUnsubscribed, copies: baselineCopies, cleaned, failed: engine.failed };
    } finally { engine.stop(); hosts.forEach(h => h.remove()); originals.forEach(fn => fn()); }
  });
  assert.equal(result.devices, 1); assert.equal(result.firstPipelines, 1); assert.ok(result.unchangedPipelines);
  assert.equal(result.animationSchedules, 1); assert.equal(result.copies, 0);
  for (const key of ['noAnimationMeasurement', 'stable', 'replacementPaddingChanged', 'explicitGrowth', 'resized', 'oldUnsubscribed', 'cleaned']) assert.ok(result[key], key);
  assert.equal(result.failed, false);
  const suppliedInputs = await page.evaluate(async () => {
    const { createEngine } = await import('/packages/oyn/src/core/engine.ts');
    const { createCeramicMaterial } = await import('/packages/oyn/src/materials/ceramic/index.ts');
    const element = document.createElement('div');
    element.style.cssText = 'width:120px;height:40px';
    document.body.append(element);
    let reads = 0, nativeListeners = 0, sameSource = true;
    const subscriptions = new Set();
    let position = { x: 60, y: 20 };
    const inputs = { pointer: {
      getSnapshot() { reads++; return { position, inside: true, focused: true, visible: true }; },
      subscribe(listener) { subscriptions.add(listener); return () => subscriptions.delete(listener); },
    } };
    const source = createCeramicMaterial();
    const material = Object.create(source, { bind: { value(context) {
      sameSource &&= context.inputs === inputs;
      return source.bind(context);
    } } });
    const engine = createEngine();
    engine.entries.set(element, { element, material });
    const add = window.addEventListener;
    window.addEventListener = function(type, ...args) {
      if (type === 'pointermove') nativeListeners++;
      return add.call(this, type, ...args);
    };
    const settle = async () => {
      for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
    };
    try {
      engine.start(false, inputs);
      await settle();
      const connected = subscriptions.size === 1 && !!element.querySelector('canvas');
      const before = reads;
      position = { x: 100, y: 30 };
      subscriptions.forEach(listener => listener());
      await settle();
      const redrawn = reads > before;
      engine.stop();
      const released = subscriptions.size === 0 && !element.querySelector('canvas');
      engine.start(false, inputs);
      await settle();
      return { connected, redrawn, released, reconnected: subscriptions.size === 1,
        sameSource, nativeListeners };
    } finally {
      engine.stop();
      element.remove();
      window.addEventListener = add;
    }
  });
  for (const key of ['connected', 'redrawn', 'released', 'reconnected', 'sameSource'])
    assert.equal(suppliedInputs[key], true, key);
  assert.equal(suppliedInputs.nativeListeners, 0, 'Supplied inputs replace native listeners');
  const refs = await page.evaluate(async () => (await import('/tests/fixtures/surface-refs.tsx')).checkRefLifecycle());
  assert.equal(refs.firstCanvases, 1);
  for (const key of ['stableOnMaterialChange', 'oldRefCleaned', 'newRefCleaned', 'objectAttached', 'objectCleared', 'noCanvases']) assert.ok(refs[key], key);
  await page.evaluate(async () => {
    const { createEngine } = await import('/packages/oyn/src/core/engine.ts');
    const { createCeramicMaterial } = await import('/packages/oyn/src/materials/ceramic/index.ts');
    document.body.style.background = '#808080';
    const element = document.createElement('div');
    element.style.cssText = 'position:absolute;left:100px;top:100px;width:160px;height:100px;border-radius:12px';
    document.body.append(element);
    const material = createCeramicMaterial({ colorScheme: 'dark', elevation: 12 });
    const engine = createEngine();
    const meshes = engine.entries;
    meshes.set(element, { element, material });
    engine.start();
    window.visual = { material, element, meshes, engine };
  });
  await page.waitForSelector('[data-oyn-canvas]');
  await page.waitForTimeout(200);
  const png = PNG.sync.read(await page.screenshot({path:'/tmp/oyn-package.png'}));
  const pixel = (x,y) => [...png.data.slice((y*png.width+x)*4,(y*png.width+x)*4+4)];
  assert.deepEqual(pixel(180,150), [12,12,12,255], 'dark material paints its DOM-aligned center');
  assert.deepEqual(pixel(50,50), [128,128,128,255]);
  await page.evaluate(async () => {
    const { createCeramicMaterial } = await import('/packages/oyn/src/materials/ceramic/index.ts');
    window.visual.meshes.get(window.visual.element).material = createCeramicMaterial({ elevation: 12 });
    window.visual.engine.requestMeasure();
  });
  await page.waitForTimeout(100);
  const light = PNG.sync.read(await page.screenshot());
  assert.ok(light.data[(150 * light.width + 180) * 4] >= 235, 'light material repaints without pipeline state leaking');
  await page.evaluate(() => { window.visual.engine.stop(); window.visual.element.remove(); });
  const failureChecks = await page.evaluate(async () => {
    const { createRenderer } = await import('/packages/oyn/src/core/renderer.ts');
    const { createEngine } = await import('/packages/oyn/src/core/engine.ts');
    const { createCeramicMaterial } = await import('/packages/oyn/src/materials/ceramic/index.ts');
    const own = Object.getOwnPropertyDescriptor(navigator, 'gpu');
    let unavailable = false;
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    try { const fallback = await createRenderer(() => {}); unavailable = !!fallback.ready; fallback.dispose(); }
    finally { if (own) Object.defineProperty(navigator, 'gpu', own); else delete navigator.gpu; }
    const wait = async predicate => { for (let i = 0; !predicate(); i++) { if (i > 300) throw Error('Failure cleanup timed out'); await new Promise(requestAnimationFrame); } };
    const host = document.createElement('div'); host.style.cssText = 'width:100000px;height:10px'; document.body.append(host);
    const material = createCeramicMaterial(); const mesh = { element: host, material };
    const reported = [];
    const originalError = console.error;
    console.error = (...args) => reported.push(args.map(String).join(' '));
    const engine = createEngine();
    engine.entries.set(host, mesh);
    engine.start();
    await wait(() => engine.failed);
    const oversized = reported.some(message => message.includes('exceeds GPU limit')) && !host.querySelector('canvas');
    engine.stop(); host.remove();
    let device;
    const request = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function(...args) { device = await request.apply(this, args); return device; };
    const el = document.createElement('div'); el.style.cssText = 'width:100px;height:40px'; document.body.append(el);
    const lossEngine = createEngine();
    lossEngine.entries.set(el, { element: el, material });
    lossEngine.start();
    try {
      await wait(() => el.querySelector('canvas'));
      device.destroy(); await wait(() => lossEngine.failed);
      const lossCleaned = !el.querySelector('canvas') && reported.some(message => message.includes('device lost'));
      return { unavailable, oversized, lossCleaned };
    } finally { lossEngine.stop(); el.remove(); GPUAdapter.prototype.requestDevice = request; console.error = originalError; }
  });
  assert.ok(failureChecks.unavailable && failureChecks.oversized && failureChecks.lossCleaned, JSON.stringify(failureChecks));
  assert.deepEqual(errors, []);
  console.log('PASS: WebGPU packages, shared device/pipelines, independent canvases, numeric updates, explicit Motion adapter, frozen budgets, resize, material replacement, cleanup and StrictMode refs.');
} finally { await browser?.close(); server.kill(); }
