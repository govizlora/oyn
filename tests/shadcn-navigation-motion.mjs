import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.addInitScript(() => {
    window.recessDepths = [];
    const write = GPUQueue.prototype.writeBuffer;
    GPUQueue.prototype.writeBuffer = function(buffer, offset, data, ...args) {
      // Match the navigation frame, excluding unrelated recessed Select triggers.
      if (data instanceof Float32Array && data.length === 12) {
        window.recessFrameMatches = window.recessTarget &&
          data[6] === window.recessTarget[0] && data[7] === window.recessTarget[1];
      }
      // Signed height has one uniform lane on either side of the plane.
      if (window.recessFrameMatches && data instanceof Float32Array && data.length === 28 &&
          data[1] < 0 && Math.abs(data[1] + 2.3) > 0.0001) window.recessDepths.push(-data[1]);
      return write.call(this, buffer, offset, data, ...args);
    };
  });
  await page.goto('http://127.0.0.1:5176');
  await page.getByRole('button', { name: 'Ceramic', exact: true }).click();
  const nav = page.locator('[data-sidebar="menu-button"]').filter({ hasText: /^Dashboard$/ });
  await nav.evaluate(el => { window.recessTarget = [el.offsetWidth, el.offsetHeight]; });
  const reset = () => page.evaluate(() => { window.recessDepths = []; });
  const depths = () => page.evaluate(() => window.recessDepths);
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.mouse.move(720, 10);
    await page.waitForTimeout(650);
    await reset();
    await nav.hover();
    await page.waitForTimeout(650);
    const enter = await depths();
    assert.ok(new Set(enter.filter(v => v > 0.01 && v < 3.95)).size >= 3, 'hover uploads intermediate negative elevations');
    assert.ok(Math.abs(enter.at(-1) - 4) < 0.01, 'hover settles at -4');
    await reset();
    await page.mouse.down();
    await page.waitForTimeout(500);
    const press = await depths();
    assert.ok(press.some(v => v > 4.05 && v < 5.95), 'press deepens continuously');
    assert.ok(Math.abs(press.at(-1) - 6) < 0.01);
    await page.mouse.up();
    await page.waitForTimeout(650);
    assert.ok(Math.abs((await depths()).at(-1) - 4) < 0.01);
    await reset();
    await page.mouse.move(720, 10);
    await page.waitForTimeout(100);
    assert.equal(await nav.locator('canvas').count(), 1, 'exit keeps the canvas while animating');
    await page.waitForTimeout(550);
    assert.equal(await nav.locator('canvas').count(), 0, 'exit detaches after settling');
    assert.ok((await depths()).some(v => v > 0.05 && v < 3.8), 'exit visibly unwinds the depth');
    // Interrupt in both directions and then settle.
    await nav.hover(); await page.waitForTimeout(70);
    await page.mouse.move(720, 10); await page.waitForTimeout(50);
    await nav.hover(); await page.waitForTimeout(650);
    assert.ok(Math.abs((await depths()).at(-1) - 4) < 0.01);
    await page.screenshot({ path: 'test-results/navigation-motion-' + theme.toLowerCase() + '.png' });
    await page.mouse.move(720, 10);
    await page.waitForTimeout(650);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await reset(); await nav.hover(); await page.waitForTimeout(100);
  assert.ok((await depths()).every(v => Math.abs(v - 4) < 0.01), 'reduced motion applies final depth directly');
  await page.mouse.move(720, 10);
  await page.waitForTimeout(100);
  assert.equal(await nav.locator('canvas').count(), 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await nav.hover();
  await page.waitForTimeout(50);
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await page.waitForTimeout(700);
  assert.equal(await page.locator('[data-oyn-canvas]').count(), 0, 'mode switch cleans up active animation');
  assert.deepEqual(errors, []);
  console.log('PASS: GPU depth animation, press/release, graceful exit, interruption, both themes, reduced motion and cleanup.');
} finally { await browser.close(); }
