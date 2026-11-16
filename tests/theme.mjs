import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  for (const port of [5175, 5176]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}`);
    const group = page.getByRole('group', { name: 'Color mode' });
    await group.waitFor();
    assert.equal(await group.getAttribute('data-slot'), 'button-group');
    assert.equal(await group.getAttribute('data-orientation'), 'horizontal');
    await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Color mode"]').dataset.orientation === 'vertical');
    await group.getByRole('button', { name: 'Dark', exact: true }).click();
    await group.getByRole('button', { name: 'System', exact: true }).click();
    await page.getByRole('button', { name: 'Toggle Sidebar', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="Color mode"]').dataset.orientation === 'horizontal');
    const mode = name => group.getByRole('button', { name, exact: true });
    const check = async dark => {
      await page.waitForFunction(dark => document.documentElement.classList.contains('dark') === dark, dark);
      assert.equal(await group.locator('[aria-pressed=true]').count(), 1);
    };
    assert.equal(await mode('System').getAttribute('aria-pressed'), 'true');
    await check(false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await check(true);
    await mode('Light').click(); await check(false);
    await page.emulateMedia({ colorScheme: 'light' });
    await mode('Dark').click(); await check(true);
    if (port === 5176) {
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-surface-card] canvas');
        if (!canvas) return false;
        const pixel = canvas.getContext('2d').getImageData(canvas.width/2, canvas.height/2, 1, 1).data;
        return pixel[0] < 100 && pixel[3] > 240;
      });
    } else assert.equal(await page.locator('canvas').count(), 0);
    await page.waitForTimeout(250); // Let native button color transitions settle before visual review.
    await page.screenshot({ path: `test-results/theme-dark-${port}.png` });
    await page.getByRole('button', { name: 'New project', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({ path: `test-results/theme-dark-dialog-${port}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await mode('System').click(); await check(false);
    await page.emulateMedia({ colorScheme: 'dark' }); await check(true);
    await page.reload(); await group.waitFor();
    assert.equal(await mode('System').getAttribute('aria-pressed'), 'true');
    await check(true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: both demos, three exclusive modes, live system changes, explicit override, Surface dark material, dialog, refresh default.');
} finally { await browser.close(); }
