import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(10000);
  // Stress stacking with a long shadow; the production elevation 4 intentionally
  // no longer reaches this patch beyond the sidebar's 8px padding.
  await page.route('**/src/ceramic/materials.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/panelMaterial = ceramic\(\{ elevation: 4 \}\)/, 'panelMaterial = ceramic({ elevation: 16 })');
    await route.fulfill({ response, body });
  });
  await page.goto('http://127.0.0.1:5176');
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  const panel = page.locator('[data-surface-panel]');
  await panel.locator('canvas').waitFor();
  await page.mouse.move(1000, 500);
  await page.waitForTimeout(300);
  const bounds = await panel.boundingBox();
  const sidebar = page.locator('[data-slot=sidebar-container]');
  assert.equal(await sidebar.evaluate(el => getComputedStyle(el).zIndex), 'auto');
  const snapshot = async () => PNG.sync.read(await page.screenshot());
  const visible = await snapshot();
  await sidebar.evaluate(el => { el.style.zIndex = "10"; });
  const occluded = await snapshot();
  await sidebar.evaluate(el => { el.style.zIndex = ""; });
  await panel.evaluate(el => { el.style.visibility = 'hidden'; });
  const hidden = await snapshot();
  await panel.evaluate(el => { el.style.visibility = ''; });
  // This patch lies inside the sidebar's opaque background, beyond its 8px padding.
  // The former z-10 sidebar erased the shadow here entirely.
  let difference = 0, occludedDifference = 0, count = 0;
  for (let y = Math.floor((bounds.y + 150) * 2); y < (bounds.y + 200) * 2; y++) {
    for (let x = Math.floor((bounds.x - 16) * 2); x < (bounds.x - 10) * 2; x++) {
      const i = (y * visible.width + x) * 4;
      difference += hidden.data[i] - visible.data[i];
      occludedDifference += Math.abs(hidden.data[i] - occluded.data[i]); count++;
    }
  }
  assert.ok(difference / count > 0.5, `shadow must reach the sidebar background, average darkening ${difference / count}`);
  assert.ok(occludedDifference / count < 0.1, "the old sidebar z-10 reproduces the erased shadow");
  await page.screenshot({ path: 'test-results/panel-shadow-stacking.png' });
  // Navigation and overlay menus remain usable; no shadow overlay intercepts pointers.
  await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(550);
  await page.mouse.click(385, 400);
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  console.log('PASS: panel shadow reaches the sidebar background; desktop navigation and mobile overlay remain usable.');
} finally { await browser.close(); }
