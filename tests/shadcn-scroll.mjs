import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:5176');
    const scroll = page.locator('[data-dashboard-scroll]');
    await page.getByText('Total Revenue', { exact: true }).waitFor();
    // Store identity only in the test; production relies on native scroll ownership.
    await scroll.evaluate(el => { window.scrollOwner = el; el.scrollTop = 650; });
    for (const mode of ['Ceramic', 'Original', 'Ceramic', 'Original']) {
      const before = await scroll.evaluate(el => el.scrollTop);
      assert.ok(before > 500);
      await page.getByRole('button', { name: mode, exact: true }).click();
      await page.waitForTimeout(400);
      assert.equal(await scroll.evaluate(el => el === window.scrollOwner), true);
      const after = await scroll.evaluate(el => el.scrollTop);
      assert.ok(Math.abs(after - before) <= 1, `${viewport.width}px ${mode}: scroll ${before} → ${after}`);
    }
    await page.close();
  }
  console.log('PASS: desktop/mobile scroll owner and scroll position persist across repeated mode changes.');
} finally { await browser.close(); }
