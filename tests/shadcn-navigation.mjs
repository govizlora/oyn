import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5176');
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    const primary = page.getByRole('button', { name: 'Quick Create', exact: true });
    assert.equal(await primary.getAttribute('data-surface-button'), '');
    await primary.hover();
    assert.equal(await primary.getAttribute('data-surface-navigation'), null);
    const nav = page.locator('[data-sidebar="menu-button"]').filter({ hasText: /^Dashboard$/ });
    await nav.hover();
    await page.waitForFunction(() => !!document.querySelector('[data-surface-navigation] canvas'));
    assert.equal(await nav.getAttribute('data-surface-navigation'), '');
    assert.equal(await nav.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.equal(await nav.getAttribute('data-surface-elevation'), '-4');
    await page.mouse.down();
    assert.equal(await nav.getAttribute('data-surface-elevation'), '-6');
    await page.waitForTimeout(100);
    await page.mouse.up();
    assert.equal(await nav.getAttribute('data-surface-elevation'), '-4');
    await nav.focus();
    await page.keyboard.down(' ');
    assert.equal(await nav.getAttribute('data-surface-elevation'), '-6');
    await page.keyboard.up(' ');
    assert.equal(await nav.getAttribute('data-surface-elevation'), '-4');
    await nav.dispatchEvent('pointercancel');
    assert.equal(await nav.getAttribute('data-surface-elevation'), null);
    await page.mouse.move(900, 20);
    await nav.hover();
    await page.screenshot({ path: 'test-results/navigation-' + theme.toLowerCase() + '.png' });
    await page.mouse.move(900, 20);
    await page.waitForFunction(() => !document.querySelector('[data-surface-navigation]'));
  }
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-oyn-canvas]'));
  assert.deepEqual(errors, []);
  console.log('PASS: ordinary primary button, concave navigation hover, pointer leave and original cleanup in both themes.');
} finally { await browser.close(); }
