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
  const selected = async (label) =>
    assert.equal(
      await page.getByRole('radio', { name: label, exact: true }).isChecked(),
      true,
    );
  const renderChanged = async (locator, action) => {
    await page.mouse.move(20, 20);
    await settle();
    const before = await locator.screenshot();
    await action();
    await page.mouse.move(20, 20);
    await settle();
    assert.ok(
      !before.equals(await locator.screenshot()),
      'control changes rendered output',
    );
  };
  await page.goto(base + '/?study=1');
  await ready();
  assert.equal(await page.locator('.instrument canvas').count(), 32);
  const volume = page.getByRole('slider', {
    name: 'Master volume',
    exact: true,
  });
  await volume.focus();
  await volume.press('End');
  assert.equal(await volume.inputValue(), '100');
  await volume.press('Home');
  assert.equal(await volume.inputValue(), '0');
  const knob = await volume.boundingBox();
  await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    knob.x + knob.width / 2,
    knob.y + knob.height / 2 - 80,
    { steps: 8 },
  );
  await page.mouse.up();
  assert.equal(await volume.inputValue(), '52');
  await page.getByRole('switch', { name: 'Power', exact: true }).press('Space');
  assert.equal(
    await page.getByRole('switch', { name: 'Power', exact: true }).isChecked(),
    false,
  );
  await page
    .getByRole('radio', { name: 'Signal shape: circle', exact: true })
    .check();
  await selected('Signal shape: circle');
  await page
    .getByRole('radio', { name: 'Signal shape: circle', exact: true })
    .press('ArrowRight');
  await selected('Signal shape: grid');
  const pad = page.getByRole('button', { name: 'Ceramic pad 2', exact: true });
  await pad.click();
  assert.equal(await pad.getAttribute('aria-pressed'), 'true');
  await page.getByRole('radio', { name: 'ink finish', exact: true }).check();
  await selected('ink finish');
  const balance = page.getByRole('slider', {
    name: 'Signal balance',
    exact: true,
  });
  await balance.focus();
  await balance.press('End');
  assert.equal(await balance.inputValue(), '100');
  await page
    .getByRole('radio', { name: 'Signal · Soft machine', exact: true })
    .check();
  await ready();
  assert.equal(new URL(page.url()).searchParams.get('study'), '2');
  assert.equal(await page.locator('.instrument canvas').count(), 22);
  const screen = page.locator('.phosphor canvas');
  await renderChanged(screen, async () => {
    await page
      .getByRole('slider', { name: 'Signal amplitude', exact: true })
      .focus();
    await page
      .getByRole('slider', { name: 'Signal amplitude', exact: true })
      .press('Home');
  });
  await renderChanged(screen, () =>
    page.getByRole('radio', { name: 'Display: circle', exact: true }).check(),
  );
  const vertical = page.getByRole('slider', {
    name: 'Signal channel 1',
    exact: true,
  });
  await vertical.focus();
  await vertical.press('ArrowUp');
  assert.equal(await vertical.inputValue(), '63');
  await page.getByRole('button', { name: 'Reset signal', exact: true }).click();
  assert.equal(await vertical.inputValue(), '62');
  await page.getByRole('button', { name: 'Play signal', exact: true }).click();
  await page.mouse.move(20, 20);
  await settle();
  let a = await screen.screenshot();
  await page.waitForTimeout(200);
  assert.ok(
    !a.equals(await screen.screenshot()),
    'playing animates the phosphor signal',
  );
  await page.getByRole('button', { name: 'Pause signal', exact: true }).click();
  await page.mouse.move(20, 20);
  await settle();
  a = await screen.screenshot();
  await page.waitForTimeout(200);
  assert.ok(
    a.equals(await screen.screenshot()),
    'paused signal is completely idle',
  );
  await page
    .getByRole('radio', { name: 'Play · Future instrument', exact: true })
    .check();
  await ready();
  assert.equal(await page.locator('.instrument canvas').count(), 59);
  const playScreen = page.locator('.play-screen-housing .phosphor canvas');
  for (const label of ['grid', 'circle', 'diamond', 'wave']) {
    await renderChanged(playScreen, () =>
      page
        .getByRole('radio', { name: `Oscillator: ${label}`, exact: true })
        .check(),
    );
  }
  await page.getByRole('radio', { name: 'Position 10', exact: true }).check();
  await selected('Position 10');
  await page
    .getByRole('button', { name: 'Advance sequence', exact: true })
    .click();
  await selected('Position 11');
  await page.getByRole('button', { name: 'Note 8', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Note 8', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Accidental 5', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Accidental 5', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Drum pad 1', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Drum pad 1', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Record', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Drum pad 1', exact: true })
      .getAttribute('aria-pressed'),
    'true',
    'record and pad states are independent',
  );
  await renderChanged(playScreen, () =>
    page
      .getByRole('switch', { name: 'Instrument power', exact: true })
      .uncheck(),
  );
  await page
    .getByRole('switch', { name: 'Instrument power', exact: true })
    .check();
  const stats = await page.evaluate(() => window.gpuStats);
  assert.equal(
    stats.devices - stats.destroyed,
    1,
    'one live device across all three studies',
  );
  assert.equal(stats.copies, 0);
  assert.equal(
    stats.pipelines,
    4,
    'one cached program per material, not per element',
  );
  await page.mouse.move(20, 20);
  await settle();
  const idle = await page.evaluate(() => window.gpuStats.submits);
  await page.waitForTimeout(200);
  assert.equal(
    await page.evaluate(() => window.gpuStats.submits),
    idle,
    'no idle draw loop',
  );
  await page.goBack();
  await ready();
  assert.equal(await page.locator('.atelier').getAttribute('data-study'), '2');
  await page.goForward();
  await ready();
  assert.equal(await page.locator('.atelier').getAttribute('data-study'), '3');
  // Reduced motion suppresses the optional display clock, including a live preference change.
  await page.getByRole('button', { name: 'Play signal', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(20, 20);
  await settle();
  a = await playScreen.screenshot();
  await page.waitForTimeout(250);
  assert.ok(
    a.equals(await playScreen.screenshot()),
    'reduced motion has no signal clock',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page
    .getByRole('switch', { name: 'Instrument power', exact: true })
    .uncheck();
  await page.mouse.move(20, 20);
  await settle();
  const poweredOff = await page.evaluate(() => window.gpuStats.submits);
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => window.gpuStats.submits),
    poweredOff,
    'power off suspends the signal clock',
  );
  await page
    .getByRole('switch', { name: 'Instrument power', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Reset instrument', exact: true })
    .click();
  await selected('Position 4');
  assert.equal(
    await page
      .getByRole('button', { name: 'Play signal', exact: true })
      .getAttribute('aria-pressed'),
    'false',
  );
  results.push({ interactions: 'passed', gpu: stats });
  // Clean-state visual review at large, common laptop, compact, and narrow sizes.
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
        const board = document
          .querySelector('.instrument')
          .getBoundingClientRect();
        const controls = [
          ...document.querySelectorAll('.instrument button,.instrument input'),
        ].map((e) => e.getBoundingClientRect());
        return {
          width: innerWidth,
          height: innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          board: {
            left: board.left,
            right: board.right,
            top: board.top,
            bottom: board.bottom,
          },
          outside: controls.filter(
            (r) =>
              r.width &&
              r.height &&
              (r.left < board.left - 1 ||
                r.right > board.right + 1 ||
                r.top < board.top - 1 ||
                r.bottom > board.bottom + 1),
          ).length,
        };
      });
      assert.ok(
        geometry.scrollWidth <= viewport.width,
        `study ${study} no horizontal overflow at ${viewport.width}`,
      );
      assert.equal(
        geometry.outside,
        0,
        `study ${study} controls remain inside their instrument at ${viewport.width}`,
      );
      if (viewport.width > 760) {
        assert.equal(geometry.scrollHeight, viewport.height);
        assert.ok(
          geometry.board.top > 0 &&
            geometry.board.bottom < viewport.height - 45,
          'desktop composition fits in one screen',
        );
      }
      const filename = `study-${study}-${viewport.width}x${viewport.height}${process.env.BROWSER === 'firefox' ? '-firefox' : ''}.png`;
      await page.screenshot({
        path: new URL(filename, out).pathname,
        fullPage: true,
      });
      results.push({ study, viewport, geometry, screenshot: filename });
    }
  }
  assert.deepEqual(errors, []);
  // Explicit unsupported state, not a CSS material fallback or a blank page.
  const unsupported = await browser.newPage();
  await unsupported.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', { get: () => undefined }),
  );
  await unsupported.goto(base);
  await unsupported.getByRole('alert').waitFor();
  assert.equal(await unsupported.locator('canvas').count(), 0);
  await unsupported.close();
  await writeFile(
    new URL(
      `results${process.env.BROWSER === 'firefox' ? '-firefox' : ''}.json`,
      out,
    ),
    JSON.stringify(results, null, 2),
  );
  console.log(
    'PASS: 3 studies; native keyboard/pointer controls; live GPU feedback; four cached pipelines; one live device; idle/reduced-motion; history; 5 responsive sizes; no WebGPU errors; explicit unsupported state.',
  );
} finally {
  server?.kill();
  await browser?.close();
}
