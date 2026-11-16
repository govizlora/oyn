import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  for (const deviceScaleFactor of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor });
    await page.goto('http://127.0.0.1:5176');
    // Hold the real shadcn opening animation at its scaled first frame.
    await page.addStyleTag({ content: '[role=dialog] { animation-play-state: paused !important; }' });
    await page.getByRole('button', { name: 'New project', exact: true }).click();
    await page.waitForSelector('[role=dialog] [data-oyn-canvas]');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const alignment = () => page.getByRole('button', { name: 'Create project', exact: true }).evaluate(button => {
      const canvas = button.closest('[role=dialog]').querySelector('[data-oyn-canvas]');
      const c = canvas.getBoundingClientRect(), b = button.getBoundingClientRect();
      const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 245 && data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) {
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      return {
        x: c.left + (left + right + 1) / 2 * c.width / width - (b.left + b.width / 2),
        y: c.top + (top + bottom + 1) / 2 * c.height / height - (b.top + b.height / 2),
        width: (right - left + 1) * c.width / width - b.width,
        height: (bottom - top + 1) * c.height / height - b.height,
      };
    });
    for (const phase of ['opening', 'finished']) {
      if (phase === 'finished') {
        await page.evaluate(() => document.querySelector('[role=dialog]').getAnimations().forEach(a => a.finish()));
        await page.waitForTimeout(100);
      }
      const delta = await alignment();
      console.log({ deviceScaleFactor, phase, delta });
      assert.ok(Math.abs(delta.x) < 2 && Math.abs(delta.y) < 2, `${phase}: Surface must align with button text`);
      assert.ok(Math.abs(delta.width) < 4 && Math.abs(delta.height) < 4, `${phase}: Surface must match button size`);
    }
    await page.screenshot({ path: `test-results/surface-dialog-aligned-${deviceScaleFactor}.png` });
    await page.close();
  }
} finally { await browser.close(); }
