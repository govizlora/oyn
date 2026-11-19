import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5195';
const server = process.env.BASE_URL
  ? null
  : spawn(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        '5195',
        '--strictPort',
      ],
      { stdio: 'pipe' },
    );
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (i === 59) throw Error('Preview did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.addInitScript(() => {
    window.stats = { pipelines: 0, submits: 0 };
    for (const [proto, name, key] of [
      [GPUDevice.prototype, 'createRenderPipeline', 'pipelines'],
      [GPUQueue.prototype, 'submit', 'submits'],
    ]) {
      const original = proto[name];
      proto[name] = function (...args) {
        window.stats[key]++;
        return original.apply(this, args);
      };
    }
  });
  await page.goto(`${base}/?view=solids`);
  await page.locator('.solid-object canvas').nth(5).waitFor();
  await page.mouse.move(250, 160);
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.solid-object canvas').count(), 6);
  assert.equal(
    await page.evaluate(() => window.stats.pipelines),
    2,
    'All shapes share one surface and one shadow pipeline',
  );
  await mkdir('test-results/solids', { recursive: true });
  await page.screenshot({ path: 'test-results/solids/desktop.png' });
  const before = await page.locator('.solid-tile').nth(1).screenshot();
  await page.mouse.move(1250, 850);
  await page.waitForTimeout(150);
  assert.notDeepEqual(
    await page.locator('.solid-tile').nth(1).screenshot(),
    before,
    'Geometry shadows must respond to light',
  );
  // Inspect canvas alpha: the hole must expose the receiving plane, not a painted face.
  const centerAlpha = () =>
    page
      .locator('.solid-object canvas')
      .nth(1)
      .evaluate((canvas) => canvas.toDataURL());
  const alpha = async () => {
    const data = await centerAlpha();
    const png = PNG.sync.read(Buffer.from(data.split(',')[1], 'base64'));
    return png.data[
      (Math.floor(png.height / 2) * png.width + Math.floor(png.width / 2)) * 4 +
        3
    ];
  };
  assert.ok(
    (await alpha()) < 100,
    'The ring has a genuinely transparent opening',
  );
  await page
    .getByRole('button', { name: 'Through-ring boolean operation' })
    .click();
  await page.waitForTimeout(150);
  assert.equal(await alpha(), 255, 'The uncut cylinder fills the opening');
  await page
    .getByRole('button', { name: 'Through-ring boolean operation' })
    .click();
  for (const select of await page.getByRole('combobox').all()) {
    await select.selectOption('0');
    await select.selectOption('100');
  }
  for (const button of await page.locator('.solid-tile button').all()) {
    await button.click();
    await button.click();
  }
  assert.equal(
    await page.evaluate(() => window.stats.pipelines),
    2,
    'Editing geometry must not compile another shader',
  );
  await page.waitForTimeout(300);
  const submits = await page.evaluate(() => window.stats.submits);
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => window.stats.submits),
    submits,
    'No idle rendering loop',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: 'test-results/solids/mobile.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Sculpted' }).click();
  await page.locator('.sculpture-board canvas').first().waitFor();
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(`${base}/?view=card-comparison`);
  await page.getByRole('link', { name: 'Card', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('view'), 'card');
  await page.locator('.card-specimen canvas').waitFor();
  const slider = page.getByRole('slider', { name: 'Background brightness' });
  const background = () => page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor);
  assert.equal(await slider.inputValue(), '0');
  const initial = await background();
  for (const extreme of ['-100', '100']) {
    await slider.fill(extreme);
    assert.notEqual(await background(), initial);
  }
  await page.getByRole('button', { name: 'Reset background brightness' }).click();
  assert.equal(await background(), initial);
  const scheme = () => page.locator('.card-specimen').evaluate(el => getComputedStyle(el).colorScheme);
  const previous = await scheme();
  await page.getByRole('button', { name: 'Dark mode' }).click();
  assert.notEqual(await scheme(), previous);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    'Solids: Baked presets, true aperture alpha, all edits, two cached passes, idle scheduling, mobile, navigation and native card controls passed.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
