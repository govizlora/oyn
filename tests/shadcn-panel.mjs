import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5176');
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  const surface = page.locator('[data-surface-panel]');
  await surface.locator('canvas').waitFor();
  assert.equal(await page.evaluate(async () => (await import('/src/ceramic/materials.ts')).panelMaterial.parameters.get(1)), 4);
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.locator('[data-dashboard-scroll]').evaluate(el => { el.scrollTop = 0; });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    const panelBox = await surface.boundingBox();
    const png = PNG.sync.read(await page.screenshot({ path: `test-results/panel-${theme.toLowerCase()}.png` }));
    const panelPixel = png.data[(Math.floor(panelBox.y + 24) * png.width + Math.floor(panelBox.x + panelBox.width * 0.55)) * 4];
    const sidebar = await page.locator('[data-slot=sidebar-inner]').evaluate(el => Number(getComputedStyle(el).backgroundColor.match(/[\d.]+/)[0]));
    assert.ok(theme === 'Light' ? sidebar < panelPixel : sidebar > panelPixel,
      `${theme}: sidebar ${sidebar}, rendered panel ${panelPixel}`);
    const styles = await surface.evaluate(el => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, shadow: s.boxShadow };
    });
    assert.deepEqual(styles, { background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
    assert.equal(await surface.evaluate(el => el.parentElement.querySelector('[data-dashboard-scroll]').contains(el)), false,
      'panel surface and shadow stay outside the clipping scroll viewport');
    const before = await surface.boundingBox();
    await page.locator('[data-dashboard-scroll]').evaluate(el => { el.scrollTop = 650; });
    assert.deepEqual(await surface.boundingBox(), before, 'card surface does not scroll away with its contents');
  }
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  assert.equal(await surface.count(), 0);
  await page.waitForFunction(() => !document.querySelector('[data-oyn-canvas]'));
  assert.deepEqual(errors, []);
  console.log('PASS: light/dark sidebar contrast, elevation 4, GPU-only panel paint, stationary surface and original cleanup.');
} finally { await browser.close(); }
