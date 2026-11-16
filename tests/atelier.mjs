import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium, firefox } from 'playwright';

// Production build only: this also checks workspace packaging, not just Vite HMR.
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5191';
const server = process.env.BASE_URL
  ? null
  : spawn(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        'preview',
        '--host',
        '127.0.0.1',
        '--port',
        '5191',
        '--strictPort',
      ],
      { stdio: 'pipe' },
    );
const out = new URL('../test-results/atelier/', import.meta.url);
await mkdir(out, { recursive: true });
let serverOutput = '';
let serverReady = !server;
server?.stdout.on('data', (d) => {
  if (String(d).includes('Local:')) serverReady = true;
});
server?.stderr.on('data', (d) => (serverOutput += d));
let browser;
const results = [];
try {
  for (let i = 0; ; i++) {
    if (server && server.exitCode !== null)
      throw Error(serverOutput || 'Preview exited before startup');
    try {
      if (serverReady && (await fetch(base)).ok) break;
    } catch {}
    if (i > 100) throw Error(serverOutput || 'Preview did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser =
    process.env.BROWSER === 'firefox'
      ? await firefox.launch({ headless: true })
      : await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', async (msg) => {
    if (msg.type() === 'error')
      for (const a of msg.args())
        errors.push(await a.evaluate((v) => v?.message ?? String(v)));
  });
  await page.addInitScript(() => {
    window.gpuStats = {
      devices: 0,
      destroyed: 0,
      submits: 0,
      pipelines: 0,
      copies: 0,
    };
    window.activeIntervals = new Set();
    const start = window.setInterval,
      stop = window.clearInterval;
    window.setInterval = (...args) => {
      const id = start(...args);
      window.activeIntervals.add(id);
      return id;
    };
    window.clearInterval = (id) => {
      window.activeIntervals.delete(id);
      return stop(id);
    };
    if (!window.GPUAdapter) return;
    const instrument = (proto, name, key) => {
      const original = proto[name];
      proto[name] = function (...args) {
        window.gpuStats[key]++;
        return original.apply(this, args);
      };
    };
    instrument(GPUAdapter.prototype, 'requestDevice', 'devices');
    instrument(GPUDevice.prototype, 'destroy', 'destroyed');
    instrument(GPUDevice.prototype, 'createRenderPipeline', 'pipelines');
    instrument(GPUQueue.prototype, 'submit', 'submits');
    instrument(CanvasRenderingContext2D.prototype, 'drawImage', 'copies');
  });
  // Await the actual CSS-owned motion, then Surface's scheduled frame. A fixed
  // delay equal to the transition duration can race its final layout invalidation.
  const settle = () =>
    page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
      for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
    });
  const ready = async () => {
    await page.waitForSelector('.instrument canvas, [role=alert]');
    assert.equal(
      await page.locator('[role=alert]').count(),
      0,
      `WebGPU could not initialize: ${errors.join('; ')}`,
    );
    await settle();
    assert.equal(await page.locator('[role="alert"]').count(), 0);
  };
  const role = (type, name) => page.getByRole(type, { name, exact: true });
  const countTimers = () => page.evaluate(() => window.activeIntervals.size);
  const choose = async (name) => {
    await role('radio', name).check();
    await ready();
  };
  const idle = async () => {
    await page.mouse.move(20, 20);
    await settle();
    const n = await page.evaluate(() => window.gpuStats.submits);
    await page.waitForTimeout(220);
    assert.equal(
      await page.evaluate(() => window.gpuStats.submits),
      n,
      'no idle GPU submissions',
    );
    assert.equal(await countTimers(), 0, 'no idle simulation timer');
  };
  const changed = async (locator, action) => {
    await page.mouse.move(20, 20);
    await settle();
    const before = await locator.screenshot();
    await action();
    await page.mouse.move(20, 20);
    await settle();
    assert.ok(
      !before.equals(await locator.screenshot()),
      'interaction updates rendered pixels',
    );
  };
  await page.goto(base + '/?study=1');
  await ready();
  await idle();
  assert.equal(
    await page.locator('.study-selector > button').getAttribute('aria-label'),
    'Object library',
    'library is the last navigation choice',
  );
  await choose('Air · Kinetic objects');
  const speed = role('slider', 'Rotor speed');
  await speed.focus();
  await speed.press('End');
  assert.equal(await speed.inputValue(), '100');
  await speed.press('Home');
  assert.equal(await speed.inputValue(), '0');
  const knob = await speed.boundingBox();
  await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    knob.x + knob.width / 2,
    knob.y + knob.height / 2 - 80,
    { steps: 8 },
  );
  await page.mouse.up();
  assert.equal(await speed.inputValue(), '52');
  await changed(page.locator('.air-under'), () =>
    role('button', 'Fan power').click(),
  );
  assert.equal(
    await role('switch', 'Fan enabled').isChecked(),
    true,
    'all power controls share one state',
  );
  assert.equal(
    await role('button', 'Rotor power').getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(await countTimers(), 1);
  await changed(page.locator('.rotor-paint'), () => page.waitForTimeout(140));
  await role('button', 'Reverse rotor').click();
  assert.match(
    await page.locator('.rotor-paint').getAttribute('aria-label'),
    /reverse/,
  );
  await role('switch', 'Fan enabled').uncheck();
  await idle();
  await changed(page.locator('.rotor-paint'), () =>
    role('button', 'Rotor grille').click(),
  );
  await changed(page.locator('.rotor-paint'), () =>
    role('radio', 'Blade profile: 3').check(),
  );
  assert.match(
    await page.locator('.rotor-paint').getAttribute('aria-label'),
    /7 blades/,
  );
  await role('radio', 'Blade profile: 3').press('ArrowLeft');
  assert.equal(await role('radio', 'Blade profile: 2').isChecked(), true);
  await changed(page.locator('.air-light-bar'), () =>
    role('slider', 'Pilot brightness').fill('0'),
  );
  await role('button', 'Rotor power').click();
  await speed.fill('0');
  await idle();
  await speed.fill('70');
  assert.equal(await countTimers(), 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await idle();
  await role('radio', 'Blade profile: 1').check();
  await settle();
  assert.equal(
    await page
      .locator('.detent-handle')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => window.activeIntervals.size === 1);
  assert.equal(await countTimers(), 1);
  // Exercise the visibility policy without a visible browser or timing-dependent
  // OS foreground switch. The scheduler reads document.hidden, one policy owner.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await countTimers(), 0);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await countTimers(), 1);
  await choose('Play · Tactile playground');
  assert.equal(
    await countTimers(),
    0,
    'unmounting a running rotor releases its subscription',
  );
  assert.equal(
    await page.locator('.task-list,.file-table').count(),
    0,
    'text-heavy collections no longer occupy the splash',
  );
  await changed(page.locator('.lamp-rack'), () =>
    role('button', 'Lamp 2').click(),
  );
  assert.equal(
    await role('button', 'Lamp 2').getAttribute('aria-pressed'),
    'true',
  );
  await changed(page.locator('.lamp-rack'), () =>
    role('slider', 'Lamp intensity').fill('20'),
  );
  assert.equal(
    await role('slider', 'Lamp intensity').getAttribute('aria-orientation'),
    'vertical',
  );
  await role('slider', 'Lamp intensity').press('ArrowUp');
  assert.equal(await role('slider', 'Lamp intensity').inputValue(), '21');
  await role('button', 'Key F').click();
  assert.equal(
    await page.locator('.keyboard-indicators output').innerText(),
    'F',
  );
  assert.equal(
    await role('button', 'Lamp 1').getAttribute('aria-pressed'),
    'false',
  );
  await role('button', 'Key F').press('Enter');
  assert.equal(
    await page.locator('.keyboard-indicators output').innerText(),
    'F',
    'Enter activates the focused key, not a competing keyboard handler',
  );
  assert.equal(
    await role('button', 'Lamp 1').getAttribute('aria-pressed'),
    'true',
    'one activation, one lamp change',
  );
  await role('button', 'Key F').press('a');
  assert.equal(
    await page.locator('.keyboard-indicators output').innerText(),
    'A',
  );
  await role('button', 'Key A').press('Space');
  assert.equal(
    await role('button', 'Lamp 1').getAttribute('aria-pressed'),
    'true',
  );
  await changed(page.locator('.bubble-conversation'), () =>
    role('button', 'Send spark reaction').click(),
  );
  assert.equal(await role('button', 'Change first bubble: heart').count(), 1);
  await role('button', 'Change second bubble: spark').click();
  assert.equal(await role('button', 'Change second bubble: check').count(), 1);
  await changed(page.locator('.bubble-conversation'), () =>
    role('slider', 'Bubble elevation').fill('0'),
  );
  await changed(page.locator('.tactile-pills'), () =>
    role('checkbox', 'Pill moon').check(),
  );
  assert.equal(await role('checkbox', 'Pill sun').isChecked(), true);
  await role('checkbox', 'Pill star').uncheck();
  await role('switch', 'Pocket fan enabled').check();
  assert.equal(await countTimers(), 1);
  await role('slider', 'Pocket rotor speed').fill('0');
  await idle();
  await role('slider', 'Pocket rotor speed').fill('60');
  assert.equal(await countTimers(), 1);
  await role('button', 'Rotor power').click();
  await idle();
  const gpu = await page.evaluate(() => window.gpuStats);
  assert.equal(gpu.devices - gpu.destroyed, 1);
  assert.equal(gpu.pipelines, 5);
  assert.equal(gpu.copies, 0);
  await page.goBack();
  await ready();
  assert.equal(new URL(page.url()).searchParams.get('study'), '2');
  await page.goForward();
  await ready();
  assert.equal(new URL(page.url()).searchParams.get('study'), '3');
  await role('button', 'Object library').click();
  await page.waitForSelector('.specimen-stage canvas');
  assert.equal(new URL(page.url()).searchParams.get('room'), 'hardware');
  await page
    .getByRole('navigation', { name: 'Object rooms' })
    .getByRole('button', { name: /^Archive/ })
    .click();
  assert.equal(await page.locator('.task-list').count(), 1);
  assert.equal(await page.locator('.file-table').count(), 1);
  await role('button', 'Back to homepage').click();
  await ready();
  await idle();
  results.push({ interactions: 'passed', gpu });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 900, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const study of [1, 2, 3]) {
      await page.goto(`${base}/?study=${study}`);
      await ready();
      const geometry = await page.evaluate(() => {
        const b = document.querySelector('.instrument').getBoundingClientRect();
        return {
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          board: { left: b.left, right: b.right, top: b.top, bottom: b.bottom },
          outside: [
            ...document.querySelectorAll(
              '.instrument button,.instrument input',
            ),
          ]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width &&
                r.height &&
                (r.left < b.left - 1 ||
                  r.right > b.right + 1 ||
                  r.top < b.top - 1 ||
                  r.bottom > b.bottom + 1)
              );
            })
            .map((el) => el.getAttribute('aria-label')),
        };
      });
      assert.ok(
        geometry.scrollWidth <= viewport.width,
        `no horizontal overflow study ${study} at ${viewport.width}`,
      );
      assert.deepEqual(
        geometry.outside,
        [],
        `all controls inside study ${study} at ${viewport.width}`,
      );
      if (viewport.width > 760) {
        assert.equal(geometry.scrollHeight, viewport.height);
        assert.ok(
          geometry.board.top > 0 &&
            geometry.board.bottom < viewport.height - 45,
          'one-screen desktop composition',
        );
      }
      const filename = `study-${study}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({
        path: new URL(filename, out).pathname,
        fullPage: true,
      });
      results.push({ study, viewport, geometry, screenshot: filename });
    }
  }
  assert.deepEqual(errors, []);
  const unavailable = await browser.newPage();
  await unavailable.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', { get: () => undefined }),
  );
  await unavailable.goto(base);
  await unavailable.getByRole('alert').waitFor();
  assert.equal(await unavailable.locator('canvas').count(), 0);
  await unavailable.close();
  await writeFile(
    new URL('results.json', out),
    JSON.stringify(results, null, 2),
  );
  console.log(
    'PASS: 3 tactile splash studies; rotor motion/speed/direction/grille, native keys, light bank, detents, faders, reactions, pills; one device/five cached pipelines/zero copies; motion stops at idle, reduced-motion, hidden or unmount; 15 responsive screenshots; archive preserved; no WebGPU errors.',
  );
} finally {
  server?.kill();
  await browser?.close();
}
