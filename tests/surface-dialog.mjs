import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5176');
  for (const mode of ['Light', 'Dark']) {
    await page.getByRole('button', { name: 'Original', exact: true }).click();
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.getByRole('button', { name: 'Add Section', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await dialog.getByLabel('Section name').fill('Keep my draft');
    // An external mode change deliberately remounts and closes the modal.
    await page.evaluate(() => document.querySelector('[data-preview-controls] button[aria-pressed="false"]')?.click());
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Add Section', exact: true }).click();
    await dialog.locator(':scope > [data-oyn-layer] > canvas').waitFor();
    await page.waitForTimeout(300);
    assert.equal(await dialog.getByLabel('Section name').inputValue(), '');
    const bounds = await dialog.boundingBox();
    const shadow = async () => PNG.sync.read(await page.screenshot({
      clip: { x: bounds.x - 55, y: bounds.y + 10, width: 50, height: bounds.height - 20 },
    }));
    await page.mouse.move(150, 200); await page.waitForTimeout(100);
    const left = await shadow();
    await page.mouse.move(1290, 800); await page.waitForTimeout(100);
    const right = await shadow();
    let diff = 0;
    for (let i = 0; i < left.data.length; i += 4) diff += Math.abs(left.data[i] - right.data[i]);
    assert.ok(diff > 500, 'moving exterior shadow');
    await page.screenshot({ path: `test-results/dashboard-dialog-${mode.toLowerCase()}.png` });

    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
  }
  await page.getByRole('button', { name: 'Add Section', exact: true }).click();
  await page.getByLabel('Section name').fill('Comparison test section');
  await page.getByRole('button', { name: 'Create section', exact: true }).click();
  await page.getByRole('button', { name: 'Comparison test section', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Add Section', exact: true }).click();
  await page.waitForTimeout(300);
  const box = await page.getByRole('dialog').boundingBox();
  assert.ok(box.x >= 15 && box.x + box.width <= 375);
  await page.mouse.click(5, 5);
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('PASS: registry mode switch resets dialog; light/dark shadow, create section, Escape, mobile and outside click.');
} finally { await browser.close(); }
