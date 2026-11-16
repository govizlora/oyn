import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5176');
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  await page.locator('[data-surface-panel] canvas').waitFor();
  // Make scrollbar pixels deterministic even on machines configured to auto-hide them.
  await page.addStyleTag({ content: `
    [data-dashboard-scroll]::-webkit-scrollbar { width: 16px; }
    [data-dashboard-scroll]::-webkit-scrollbar-track { background: rgb(255, 0, 255); }
    [data-dashboard-scroll]::-webkit-scrollbar-thumb { background: rgb(255, 0, 255); }
  ` });
  for (const mode of ['Light', 'Dark']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    const clip = page.locator('[data-dashboard-clip]');
    assert.equal(await clip.evaluate(el => getComputedStyle(el).overflow), 'hidden');
    assert.equal(await clip.locator('[data-surface-panel]').count(), 0, 'surface/shadow must be outside clip');
    const box = await clip.boundingBox();
    const screenshot = async () => PNG.sync.read(await page.screenshot());
    const isScrollbar = (png, x, y) => {
      const i = (Math.floor(y) * png.width + Math.floor(x)) * 4;
      return png.data[i] > 245 && png.data[i + 1] < 10 && png.data[i + 2] > 245;
    };
    await page.waitForTimeout(200);
    const clipped = await screenshot();
    const x = box.x + box.width - 2;
    assert.ok(isScrollbar(clipped, x, box.y + 30), 'scrollbar remains visible below the corner');
    assert.equal(isScrollbar(clipped, x, box.y + 1), false, 'rounded corner clips the scrollbar');
    // Reproduce the defect by removing only the new ancestor clip.
    await clip.evaluate(el => { el.style.overflow = 'visible'; });
    const unclipped = await screenshot();
    assert.ok(isScrollbar(unclipped, x, box.y + 1), 'without ancestor clipping the scrollbar breaks the corner');
    await clip.evaluate(el => { el.style.overflow = ''; });
  }
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  assert.equal(await page.locator('[data-dashboard-clip]').evaluate(el => getComputedStyle(el).overflow), 'visible');
  console.log('PASS: scrollbar clipped to Ceramic corners in light/dark; scrollbar remains usable and Original is unchanged.');
} finally { await browser.close(); }
