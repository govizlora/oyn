import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
await page.addInitScript(() => {
  window.contexts = new Set();
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = getContext.call(this, type, ...args);
    if (type === 'webgl2' && context) window.contexts.add(context);
    return context;
  };
});
try {
  await page.goto('http://127.0.0.1:5176');
  const create = page.getByRole('button', { name: 'New project', exact: true });
  await create.waitFor();
  await page.waitForSelector('[data-oyn-canvas]');
  assert.equal(await page.evaluate(() => [...window.contexts].filter(c => !c.isContextLost()).length), 1);
  assert.equal(await page.locator('[data-surface-button]').count(), 1);
  const appearance = await create.evaluate(el => {
    const style = getComputedStyle(el);
    const canvas = el.querySelector('[data-oyn-canvas]');
    const data = canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
    return { background: style.backgroundColor, shadow: style.boxShadow, color: [...data] };
  });
  assert.equal(appearance.background, 'rgba(0, 0, 0, 0)');
  assert.equal(appearance.shadow, 'none');
  assert.ok(appearance.color[3] > 240 && appearance.color[0] < 100, 'explicit primary color should be rendered by the canvas');
  assert.equal(await page.locator('[data-surface-card]').count(), 6);
  for (const card of await page.locator('[data-surface-card]').all()) {
    const appearance = await card.evaluate(el => {
      const style = getComputedStyle(el), canvas = el.querySelector('[data-oyn-canvas]');
      const pixel = canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      return { background: style.backgroundColor, shadow: style.boxShadow, border: style.borderTopWidth, alpha: pixel[3] };
    });
    assert.equal(appearance.background, 'rgba(0, 0, 0, 0)');
    assert.equal(appearance.shadow, 'none');
    assert.equal(appearance.border, '0px');
    assert.ok(appearance.alpha > 240, 'SurfaceCard material is painted');
  }
  await page.screenshot({ path: 'test-results/shadcn-surface-overview.png', animations: 'disabled' });
  await create.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Surface preview');
  await page.getByRole('combobox', { name: 'Owner', exact: true }).click();
  await page.getByRole('option', { name: 'Sam Chen', exact: true }).click();
  await page.getByRole('listbox').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.querySelector('[role=dialog] [data-oyn-canvas]'));
  await page.screenshot({ path: 'test-results/shadcn-surface-dialog.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('textbox', { name: 'Search projects' }).fill('Surface preview');
  await page.getByRole('button', { name: 'Surface preview', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForFunction(() => document.querySelector('[role=dialog] [data-oyn-canvas]'));
  await page.screenshot({ path: 'test-results/shadcn-surface-sheet.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-oyn-canvas]').length === 7);
  assert.equal(await page.evaluate(() => [...window.contexts].filter(c => !c.isContextLost()).length), 1);
  // Ghost/link controls and panels keep their original UI, only filled/outline buttons register.
  assert.equal(await page.locator('[data-surface-button]').count(), 1);
  assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-oyn-canvas]').length === 2);
  assert.equal(await page.locator('[data-surface-card]').count(), 1);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('status').waitFor();
  await page.screenshot({ path: 'test-results/shadcn-surface-settings.png', animations: 'disabled' });
  await page.getByRole('tab', { name: 'Notifications', exact: true }).click();
  await page.getByText('Notification preferences', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-surface-card]').count(), 1);
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-oyn-canvas]').length === 7);
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/shadcn-surface-mobile.png', animations: 'disabled' });
  // The untouched original must remain GPU-free.
  await page.goto('http://127.0.0.1:5175');
  await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
  assert.equal(await page.locator('canvas, [data-surface-button]').count(), 0);
  console.log('Surface buttons: explicit color, native form/select, dialog/sheet, SurfaceCards, nested settings button, cleanup, one WebGL context; original stays native.');
} finally { await browser.close(); }
