import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5176');
  const metrics = () => page.evaluate(() =>
    [document.documentElement, ...document.querySelectorAll('[data-slot=sidebar-content], [data-slot=sidebar-inset], [data-slot=tabs-content], [data-slot=table-container]')]
      .filter(e => e.clientWidth && e.clientHeight)
      .map(e => ({ slot: e.getAttribute('data-slot') ?? 'document', width: e.clientWidth, scrollWidth: e.scrollWidth, height: e.clientHeight, scrollHeight: e.scrollHeight })));
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['Light', 'Dark']) {
      await page.getByRole('button', { name: theme, exact: true }).click();
      await page.getByRole('button', { name: 'Original', exact: true }).click();
      await page.waitForTimeout(350);
      const original = await metrics();
      await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-surface-card] [data-oyn-canvas]').length === 5);
      await page.waitForTimeout(350);
      assert.deepEqual(await metrics(), original, `scroll geometry must match at ${width}px / ${theme}`);
      const next = page.getByRole('button', { name: 'Go to next page', exact: true });
      await next.scrollIntoViewIfNeeded();
      await page.locator('[data-slot=sidebar-inset]').evaluate(el => { el.scrollTop = el.scrollHeight; });
      const clipping = await next.evaluate(el => ({
        overflow: getComputedStyle(el.closest('[data-slot=tabs-content]')).overflow,
        room: el.closest('[data-slot=sidebar-inset]').getBoundingClientRect().bottom - el.getBoundingClientRect().bottom,
      }));
      assert.equal(clipping.overflow, 'visible', 'pagination must not clip exterior button shadows');
      assert.ok(clipping.room >= 15, 'the actual viewport retains bottom breathing room');
      await page.getByRole('button', { name: 'Original', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[data-oyn-layer]'));
      assert.deepEqual(await metrics(), original, 'removing material restores exactly the same scroll geometry');
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: Original/Ceramic scroll dimensions identical at 1440/1024/390px, light/dark; layer cleanup.');
} finally { await browser.close(); }
