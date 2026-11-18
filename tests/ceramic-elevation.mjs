import assert from 'node:assert/strict';
import { createCeramicMaterial } from '../packages/ceramic/dist/index.js';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

// Both programs share the one resolved Ceramic base color.
for (const options of [
  { mode: 'light' }, { mode: 'dark' },
  { mode: 'light', lightSurface: 245 }, { mode: 'dark', darkSurface: 24 },
  { mode: 'light', color: '#aabbcc' },
  { mode: 'dark', color: { light: '#eeeeee', dark: '#223344' } },
]) {
  const raised = createCeramicMaterial({ ...options, elevation: 4 });
  const color = raised.parameters.snapshot().slice(4, 7);
  for (const elevation of [-0.1, -1, -4, -6]) {
    assert.deepEqual(createCeramicMaterial({ ...options, elevation }).parameters.snapshot().slice(0, 3), color);
    raised.setElevation(elevation);
    assert.deepEqual(raised.parameters.snapshot().slice(0, 3), color);
  }
}

const material = createCeramicMaterial({ elevation: 4, maxElevation: 16 });
const initialPadding = material.measurePadding(100, 40);
const parameters = material.parameters;
const light = material.resolveMode('light');
const dark = material.resolveMode('dark');
let updates = 0;
parameters.subscribe(() => updates++);
for (const elevation of [-2, -6, 0, 4, -2]) {
  material.setElevation(elevation);
  const fresh = createCeramicMaterial({ elevation, maxElevation: 16 });
  assert.equal(material.parameters, parameters, 'parameter subscription remains stable');
  assert.equal(material.shader, fresh.shader);
  assert.deepEqual(material.parameters.snapshot(), fresh.parameters.snapshot());
  for (const [mode, resolved] of [['light', light], ['dark', dark]]) {
    assert.deepEqual(resolved.parameters.snapshot(), createCeramicMaterial({ elevation, mode }).parameters.snapshot());
  }
  assert.deepEqual(material.passes, elevation < 0 ? ['surface'] : ['shadow', 'surface']);
}
assert.ok(updates > 0);
assert.deepEqual(material.measurePadding(100, 40), initialPadding, 'Animated elevation preserves material-owned padding');
assert.deepEqual(createCeramicMaterial({ elevation: -2 }).measurePadding(100, 40), { x: 2, y: 2 });
for (const elevation of [NaN, Infinity, -Infinity, -1e40, 480]) {
  assert.throws(() => createCeramicMaterial({ elevation }));
  assert.throws(() => material.setElevation(elevation));
}
assert.throws(() => createCeramicMaterial({ elevation: -2, maxElevation: -1 }));
const late = createCeramicMaterial({ elevation: 4 });
late.setElevation(-6);
assert.deepEqual(late.resolveMode('dark').parameters.snapshot(), createCeramicMaterial({ mode: 'dark', elevation: -6 }).parameters.snapshot());

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5176');

  await page.evaluate(async root => {
    const { createCeramicMaterial } = await import(root + 'packages/ceramic/dist/index.js');
    const { createEngine } = await import(root + 'packages/surface/dist/engine.js');
    const host = document.createElement('div');
    host.id = 'elevation-test';
    host.style.cssText = 'position:fixed;z-index:9999;left:100px;top:100px;width:200px;height:80px;border-radius:12px;background:#888';
    document.body.append(host);
    const mesh = { element: host, material: createCeramicMaterial({ elevation: 4, mode: 'light', maxElevation: 16 }) };
    const engine = createEngine(new Map([[host, mesh]]));
    window.elevationTest = { mesh, engine, createCeramicMaterial };
  }, '/@fs' + fileURLToPath(new URL('../', import.meta.url)));
  const canvas = page.locator('#elevation-test canvas');
  await canvas.waitFor();
  await canvas.evaluate(el => { window.elevationTestCanvas = el; });
  for (const mode of ['light', 'dark']) {
    await page.evaluate(mode => {
      const { mesh, engine, createCeramicMaterial } = window.elevationTest;
      mesh.material = createCeramicMaterial({ mode, elevation: 4, maxElevation: 16 });
      engine.invalidate();
    }, mode);
    const images = [];
    for (const elevation of [-2, -6, 0, 4, -2]) {
      await page.evaluate(value => window.elevationTest.mesh.material.setElevation(value), elevation);
      await page.waitForTimeout(120);
      assert.ok(await canvas.evaluate(el => el === window.elevationTestCanvas), 'sign changes preserve canvas');
      const screenshot = await canvas.screenshot();
      images.push(screenshot);
      if (elevation < 0) {
        const png = PNG.sync.read(screenshot);
        const pixel = (Math.floor(png.height / 2) * png.width + Math.floor(png.width / 2)) * 4;
        const depth = -elevation;
        const coverage = 1 - Math.exp(-depth);
        const base = mode === 'light' ? 240 : 12;
        const expected = base * (1 - Math.min(depth * 0.006, 0.06)) * coverage + 136 * (1 - coverage);
        assert.ok(Math.abs(png.data[pixel] - expected) <= 2, `floor depth ${depth}: GPU ${png.data[pixel]}, expected ${expected}`);
      }
    }
    assert.ok(!images[0].equals(images[1]), 'deeper recess changes GPU output');
    assert.ok(!images[1].equals(images[2]), 'recess to flat changes GPU output');
    assert.ok(!images[2].equals(images[3]), 'flat to raised changes GPU output');
    assert.ok(images[0].equals(images[4]), 'returning to same depth restores exact pixels');
  }
  await page.evaluate(() => window.elevationTest.engine.dispose());
  assert.deepEqual(errors, []);
  console.log('PASS: signed elevation creation/updates, themes, validation, GPU program switching and stable canvas.');
} finally { await browser.close(); }
