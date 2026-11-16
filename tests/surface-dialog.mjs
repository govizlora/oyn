import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
  await page.goto('http://127.0.0.1:5176');
  for (const mode of ['Light', 'Dark']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.getByRole('button', { name: 'New project', exact: true }).click();
    const dialog = page.locator('[data-surface-dialog]');
    await dialog.locator(':scope > [data-oyn-canvas]').waitFor();
    await page.waitForTimeout(300);
    const appearance = await dialog.evaluate(el => {
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, shadow: style.boxShadow, border: style.borderTopWidth };
    });
    assert.equal(appearance.background, 'rgba(0, 0, 0, 0)');
    assert.equal(appearance.shadow, 'none');
    assert.equal(appearance.border, '0px');
    const bounds = await dialog.boundingBox();
    // Compare only exterior pixels, not the panel's moving highlight.
    const shadow = async () => PNG.sync.read(await page.screenshot({
      clip: { x: bounds.x - 55, y: bounds.y + 10, width: 50, height: bounds.height - 20 },
    }));

    await page.mouse.move(150, 200);
    await page.waitForTimeout(100);
    const left = await shadow();
    await page.mouse.move(1290, 800);
    await page.waitForTimeout(100);
    const right = await shadow();
    let difference = 0;
    for (let i = 0; i < left.data.length; i += 4) difference += Math.abs(left.data[i] - right.data[i]);
    assert.ok(difference > 500, 'exterior shadow changes with light position');
    await page.screenshot({ path: `test-results/surface-dialog-${mode.toLowerCase()}.png` });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('[data-surface-dialog]').count(), 0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.waitForTimeout(300);
  const box = await page.locator('[data-surface-dialog]').boundingBox();
  assert.ok(box.x >= 15 && box.x + box.width <= 375, 'mobile dialog stays within viewport');
  await page.mouse.click(5, 5);
  await page.locator('[data-surface-dialog]').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('Surface dialog: native behavior, light/dark material, moving exterior shadow, mobile and cleanup passed.');
} finally {
  await browser.close();
}
