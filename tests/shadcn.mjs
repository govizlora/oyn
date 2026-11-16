import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5176');
  await page.getByText('Total Revenue', { exact: true }).waitFor();
  assert.equal(await page.locator('canvas').count(), 0, 'Original has no material canvases');
  const frame = await page.locator('[data-dashboard-preview]').boundingBox();
  const controls = await page.locator('[data-preview-controls]').boundingBox();
  assert.ok(frame.x > 0 && frame.y > 0 && frame.width < 1440, 'preview is inset from the page');
  assert.ok(controls.y >= frame.y + frame.height, 'comparison controls sit below the preview');
  const sidebarTop = await page.locator('[data-slot=sidebar-container]').evaluate(el => el.getBoundingClientRect().top);
  await page.screenshot({ path: 'test-results/dashboard-original.png' });
  const initialInput = await page.locator('tbody input').first().inputValue();
  await page.locator('tbody input').first().fill('77');
  assert.equal(await page.locator('[data-slot=sidebar-container]').evaluate(el => el.getBoundingClientRect().top), sidebarTop, 'preview sidebar stays anchored while content scrolls');
  await page.locator('tbody [role=checkbox]').first().click();
  await page.evaluate(() => { window.cardBefore = document.querySelector('[data-slot=card]'); window.inputBefore = document.querySelector('tbody input'); });
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-surface-card] > [data-oyn-layer] > canvas').length === 5);
  assert.equal(await page.evaluate(() => window.cardBefore === document.querySelector('[data-slot=card]')), false);
  assert.equal(await page.evaluate(() => window.inputBefore === document.querySelector('tbody input')), false);
  assert.equal(await page.locator('tbody input').first().inputValue(), initialInput);
  assert.equal(await page.locator('tbody [role=checkbox]').first().getAttribute('data-state'), 'unchecked');
  for (const el of await page.locator('[data-surface-card], [data-surface-button]').all()) {
    const style = await el.evaluate(e => {
      const s = getComputedStyle(e);
      return { background: s.backgroundColor, image: s.backgroundImage, shadow: s.boxShadow };
    });
    assert.equal(style.background, 'rgba(0, 0, 0, 0)');
    assert.equal(style.image, 'none');
    assert.equal(style.shadow, 'none');
  }
  await page.mouse.move(1100, 220);
  await page.screenshot({ path: 'test-results/dashboard-ceramic.png' });
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-oyn-canvas]').length === 0);
  assert.equal(await page.locator('tbody input').first().inputValue(), initialInput);
  await page.getByRole('button', { name: 'Go to next page', exact: true }).click();
  const pageTwoHeader = await page.locator('tbody tr').first().innerText();
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  assert.notEqual(await page.locator('tbody tr').first().innerText(), pageTwoHeader, 'mode switch resets pagination');
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  // Retain the official detail drawer and its close behavior.
  await page.getByRole('button', { name: 'Cover page', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  // Mode persistence and dark appearance.
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.appearance === 'ceramic' && document.documentElement.classList.contains('dark') && document.querySelectorAll('[data-surface-card] > [data-oyn-layer] > canvas').length === 5);
  await page.screenshot({ path: 'test-results/dashboard-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no mobile page overflow');
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-oyn-canvas]'));
  await page.screenshot({ path: 'test-results/dashboard-mobile.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: official dashboard; mode switch remounts dashboard and resets table state; native/material paint exclusivity; drawer, persistence, dark and mobile.');
} finally { await browser.close(); }
