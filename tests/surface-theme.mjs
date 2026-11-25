import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { createCeramicMaterial } from '../packages/oyn/dist/materials/ceramic/index.js';

const light = createCeramicMaterial({ colorScheme: 'light' });
const dark = createCeramicMaterial({ colorScheme: 'dark' });
assert.equal(light.parameters.get(8), 0);
assert.equal(dark.parameters.get(8), 1);
assert.deepEqual(dark.passes, ['surface']);
assert.ok(dark.measurePadding(100, 60).x > 0); // glow, not cast shadow

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/theme-test', route => route.fulfill({
    contentType: 'text/html',
    body: `<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/@fs/${process.cwd()}/tests/fixtures/surface-theme.tsx"></script></body></html>`,
  }));
  await page.goto('http://127.0.0.1:5176/theme-test');
  await page.locator('#dark > [data-oyn-layer] > canvas').waitFor();
  const brightness = async id => {
    const box = await page.locator('#' + id).boundingBox();
    const png = PNG.sync.read(await page.screenshot({ clip: { x: box.x + 50, y: box.y + 40, width: 1, height: 1 } }));
    return png.data[0];
  };
  for (const mode of ['light', 'dark', 'light']) {
    await page.emulateMedia({ colorScheme: mode });
    await page.waitForFunction(mode => document.querySelector('#system').dataset.mode === mode, mode);
    await page.waitForTimeout(150);
    assert.ok(mode === 'dark' ? await brightness('system') < 100 : await brightness('system') > 150);
    assert.ok(await brightness('light') > 150);
    assert.ok(await brightness('dark') < 100);
    assert.ok(await brightness('fixed') < 100);
  }
  // Manual page selection overrides browser preference without a React prop.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => { document.documentElement.style.colorScheme = 'dark'; });
  await page.waitForTimeout(150);
  assert.ok(await brightness('system') < 100);
  assert.ok(await brightness('light') > 150, 'Local explicit CSS beats inherited CSS');
  await page.evaluate(() => { document.documentElement.style.colorScheme = 'light dark'; });
  await page.waitForTimeout(150);
  assert.ok(await brightness('system') > 150);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(150);
  assert.ok(await brightness('system') < 100);
  assert.deepEqual(errors, []);
  console.log('Surface theme: live system mode, explicit mode props, fixed material, shared-material isolation and elevation passed.');
} finally { await browser.close(); }
