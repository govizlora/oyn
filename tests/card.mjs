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
  const pages = ['Sculpted', 'Ripple field', 'Tabs', 'Card', 'Quiet', 'Object library', 'Native button'];
  for (const name of pages) {
    await nav.getByRole('link', { name, exact: true }).click();
    assert.equal(await nav.locator('[aria-current="page"]').innerText(), name);
    await page.locator('main').first().waitFor();
  }
  assert.deepEqual(await nav.getByRole('link').allTextContents(), pages);
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
    'Card navigation, appearance controls and mobile layout passed.',
  );
} finally {
  await browser?.close();
  server?.kill();
}
