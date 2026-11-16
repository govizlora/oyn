import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { sculptedCeramic } from '@oyn/material-ceramic/sculpted';

const material = sculptedCeramic({ hollow: 5, elevation: 12 });
const parameters = material.parameters;
material.setGeometry({ hollow: 8, tilt: 4 });
assert.equal(material.parameters, parameters);
assert.equal(parameters.get(3), 8);
material.setElevation(3);
assert.equal(parameters.get(1), 3);
assert.equal(parameters.get(3), 8);
assert.throws(() => material.setElevation(-1));
assert.throws(() => material.setGeometry({ hollowRadius: 0 }));
assert.throws(() => material.setGeometry({ tilt: Infinity }));
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5194';
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
        '5194',
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
  await page.goto(base);
  await page.locator('.crown-cap canvas').waitFor();
  await page.mouse.move(350, 150);
  await page.waitForTimeout(700);
  await mkdir('test-results/sculpted', { recursive: true });
  await page.screenshot({ path: 'test-results/sculpted/desktop.png' });
  const before = await page.locator('.dished-keys').screenshot();
  await page.mouse.move(1200, 850);
  await page.waitForTimeout(150);
  assert.notDeepEqual(
    await page.locator('.dished-keys').screenshot(),
    before,
    'Face lighting must follow the pointer',
  );
  await page.screenshot({ path: 'test-results/sculpted/alternate-light.png' });
  for (const name of [
    'Bridge switch',
    'Thumb switch',
    'Rocker 1',
    'Rocker 2',
    'Rocker 3',
  ]) {
    const control = page.getByRole('switch', { name, exact: true });
    const before = await control.getAttribute('aria-checked');
    await control.focus();
    await page.keyboard.press('Space');
    assert.notEqual(await control.getAttribute('aria-checked'), before);
  }
  for (const name of ['Graphite dished key', 'Dimple pad 2', 'Detent 4']) {
    const control = page.getByRole('button', { name, exact: true });
    await control.click();
    assert.equal(await control.getAttribute('aria-pressed'), 'true');
  }
  for (const name of ['Thumb dial', 'Saddle fader', 'Pocket dial']) {
    const slider = page.getByRole('slider', { name });
    await slider.fill('75');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await slider.inputValue(), '76');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(30, 100);
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: 'test-results/sculpted/mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Original ceramic studies' }).click();
  assert.match(page.url(), /study=1/);
  await page.locator('.composition canvas').first().waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Sculpted: geometry validation, light response, 9 control families, keyboard, mobile, and original study navigation passed.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
