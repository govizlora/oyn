import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const url = 'http://127.0.0.1:5176';
  await page.goto(url);
  const selected = async mode => {
    await page.waitForFunction(mode => document.querySelector(`button[aria-label="${mode}"]`)?.getAttribute('aria-pressed') === 'true', mode);
  };
  await selected('System');
  for (const mode of ['Dark', 'Light', 'System']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.waitForFunction(mode => localStorage.getItem('oyn:theme-mode') === mode, mode.toLowerCase());
    await page.reload();
    await selected(mode);
    assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), mode === 'Dark');
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await page.reload();
  await selected('System');
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true);
  await page.evaluate(() => localStorage.setItem('oyn:theme-mode', 'invalid'));
  await page.reload();
  await selected('System');
  // A blocked localStorage must not prevent rendering or in-memory switching.
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await page.reload();
  await selected('System');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await selected('Light');
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), false);
  assert.deepEqual(errors, []);
  console.log('PASS: light/dark/system persist across reload; system follows OS; invalid or blocked storage is safe.');
} finally { await browser.close(); }
