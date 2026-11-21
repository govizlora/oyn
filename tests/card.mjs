import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
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
  await page.goto(base);
  const nav = page.getByRole('navigation', { name: 'Projects' });
  const pages = ['Component library', 'Card', 'Sculpted', 'Ripple field', 'Quiet', 'Object library', 'Native button', 'Tabs study'];
  for (const name of pages) {
    const link = nav.getByRole('link', { name, exact: true });
    if (!(await link.isVisible())) await nav.locator('summary').filter({ hasText: 'Explorations' }).click();
    await link.click();
    assert.equal(await nav.locator('[aria-current="page"]').innerText(), name);
    await page.locator('main').first().waitFor();
  }
  assert.equal(await nav.locator('a[data-family]').count(), 55);
  await page.goto(`${base}/?view=card-comparison`);
  await page.getByRole('link', { name: 'Card', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('view'), 'card');
  await page.locator('.card-specimen canvas').waitFor();
  const slider = page.getByRole('slider', { name: 'Background contrast' });
  const background = () => page.locator('html').evaluate(el => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = getComputedStyle(el).backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[0];
  });
  const toggle = page.getByRole('button', { name: 'Dark mode' });
  assert.equal(await slider.inputValue(), '0');
  for (const dark of [false, true]) {
    if (await toggle.getAttribute('aria-pressed') !== String(dark)) await toggle.click();
    const initial = await background();
    await slider.fill('100');
    assert.equal(await background(), dark ? 68 : 187);
    await slider.fill('-100');
    assert.equal(await background(), dark ? 0 : 255);
    await page.getByRole('button', { name: 'Reset background contrast' }).click();
    assert.equal(await background(), initial);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    'Card navigation, appearance controls and mobile layout passed.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
