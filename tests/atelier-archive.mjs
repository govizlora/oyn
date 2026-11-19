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
const out = new URL('../test-results/atelier-archive/', import.meta.url);
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
  const brightness = page.getByRole('slider', {
    name: 'Display brightness',
    exact: true,
  });
  await brightness.focus();
  await brightness.press('End');
  assert.equal(await brightness.inputValue(), '100');
  await brightness.press('Home');
  assert.equal(await brightness.inputValue(), '0');
  const knob = await brightness.boundingBox();
  await page.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    knob.x + knob.width / 2,
    knob.y + knob.height / 2 - 80,
    { steps: 8 },
  );
  await page.mouse.up();
  assert.equal(await brightness.inputValue(), '52');
  await page.getByRole('switch', { name: 'Power', exact: true }).press('Space');
  assert.equal(
    await page.getByRole('switch', { name: 'Power', exact: true }).isChecked(),
    false,
  );
  await page
    .getByRole('radio', { name: 'Window arrangement: columns', exact: true })
    .check();
  await page
    .getByRole('radio', { name: 'Window arrangement: columns', exact: true })
    .press('ArrowRight');
  await selected('Window arrangement: list');
  await page
    .getByRole('button', { name: 'Favorite appearance', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Favorite appearance', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('radio', { name: 'ink finish', exact: true }).check();
  await selected('ink finish');

  await page.goto(base + '/?view=library&object=archive-focus');
  await ready();
  assert.equal(new URL(page.url()).searchParams.get('object'), 'archive-focus');
  assert.equal(await page.locator('.instrument canvas').count(), 15);
  await page.getByRole('radio', { name: '45 minutes', exact: true }).check();
  assert.equal(
    await page
      .getByRole('slider', { name: 'Focus duration', exact: true })
      .inputValue(),
    '45',
  );
  await page
    .getByRole('checkbox', { name: 'A few pages', exact: true })
    .check();
  assert.equal(
    await page.locator('.task-heading').innerText(),
    '18 / 11\n2 / 3',
  );
  await page
    .getByRole('switch', { name: 'Quiet time enabled', exact: true })
    .check();
  assert.ok(
    (await page.locator('.focus-status').innerText()).includes(
      'Do not disturb',
    ),
  );
  await page
    .getByRole('button', { name: 'November 18, 2026', exact: true })
    .focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page
      .getByRole('button', { name: 'November 19, 2026', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.keyboard.press('PageDown');
  assert.equal(
    await page
      .getByRole('button', { name: 'December 19, 2026', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page
    .getByRole('button', { name: 'December 31, 2026', exact: true })
    .click();
  await page.keyboard.press('PageDown');
  assert.equal(
    await page
      .getByRole('button', { name: 'January 31, 2027', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.keyboard.press('PageDown');
  assert.equal(
    await page
      .getByRole('button', { name: 'February 28, 2027', exact: true })
      .getAttribute('aria-pressed'),
    'true',
    'month navigation clamps the day correctly',
  );
  // Clicking the already-selected date must not leave a delayed focus request.
  await page
    .getByRole('button', { name: 'February 28, 2027', exact: true })
    .click();
  const previousMonth = page.getByRole('button', {
    name: 'Previous month',
    exact: true,
  });
  await previousMonth.click();
  assert.equal(
    await page.locator('.calendar-heading strong').innerText(),
    'January',
  );
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Next month', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
    'returning to the selected month preserves month-navigation focus',
  );
  await previousMonth.click();
  assert.equal(
    await page
      .getByRole('button', { name: 'January 1, 2027', exact: true })
      .getAttribute('tabindex'),
    '0',
  );

  await page.goto(base + '/?view=library&object=archive-desktop');
  await ready();
  assert.equal(await page.locator('.instrument canvas').count(), 50);
  const all = page.getByRole('checkbox', {
    name: 'Select all visible files',
    exact: true,
  });
  assert.equal(await all.evaluate((input) => input.indeterminate), true);
  await renderChanged(page.locator('.file-table'), () =>
    page
      .getByRole('checkbox', { name: 'Select Field notes', exact: true })
      .check(),
  );
  assert.match(await page.locator('.selection-count').innerText(), /^03/);
  await all.check();
  assert.match(await page.locator('.selection-count').innerText(), /^04/);
  assert.equal(await all.evaluate((input) => input.indeterminate), false);
  await all.uncheck();
  assert.match(await page.locator('.selection-count').innerText(), /^00/);
  await page
    .getByRole('checkbox', { name: 'Select Soft forms', exact: true })
    .check();

  const sort = page.locator('.files-toolbar summary');
  await sort.focus();
  await sort.press('ArrowDown');
  assert.equal(
    await page.locator('.files-toolbar details').evaluate((el) => el.open),
    true,
  );
  assert.equal(
    await page
      .getByRole('radio', { name: 'Sort: Recent', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('ArrowDown');
  await settle();
  assert.equal(
    await page.locator('.files-toolbar details').evaluate((el) => el.open),
    false,
  );
  assert.equal(
    await page.locator('.file-identity strong').first().innerText(),
    'Daylight',
  );
  assert.equal(
    await sort.evaluate((el) => el === document.activeElement),
    true,
  );
  await sort.click();
  await page.getByRole('radio', { name: 'Sort: Size', exact: true }).check();
  assert.equal(
    await page.locator('.file-identity strong').first().innerText(),
    'Daylight',
  );
  await sort.click();
  await page.getByRole('radio', { name: 'Sort: Recent', exact: true }).check();
  assert.equal(
    await page.locator('.file-identity strong').first().innerText(),
    'Soft forms',
  );

  const filter = page.locator('.files-heading summary');
  await filter.click();
  await page
    .getByRole('checkbox', { name: 'Show Notes', exact: true })
    .uncheck();
  assert.equal(await page.locator('.file-table tbody tr').count(), 3);
  assert.equal(
    await page.locator('.files-heading details').evaluate((el) => el.open),
    true,
    'multi-select stays open',
  );
  await page.screenshot({
    path: new URL('everyday-dropdown.png', out).pathname,
  });
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('.files-heading details').evaluate((el) => el.open),
    false,
  );
  assert.equal(
    await filter.evaluate((el) => el === document.activeElement),
    true,
  );
  await filter.click();
  await page.getByRole('checkbox', { name: 'Show Notes', exact: true }).check();
  await page
    .getByRole('slider', { name: 'Screen brightness', exact: true })
    .focus();
  assert.equal(
    await page.locator('.files-heading details').evaluate((el) => el.open),
    false,
    'tab/focus departure dismisses a dropdown',
  );

  const find = page.getByRole('searchbox', { name: 'Find files', exact: true });
  await page.keyboard.press('Meta+k');
  assert.equal(
    await find.evaluate((el) => el === document.activeElement),
    true,
  );
  const organizeY = await page
    .locator('.organize-panel')
    .evaluate((el) => el.getBoundingClientRect().y);
  await find.fill('field');
  assert.equal(await page.locator('.file-table tbody tr').count(), 1);
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Select Field notes', exact: true })
      .isChecked(),
    false,
  );
  await all.check();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Select Field notes', exact: true })
      .isChecked(),
    true,
  );
  await find.fill('nothing-matches');
  assert.equal(await page.getByText('No matches', { exact: true }).count(), 1);
  assert.equal(
    await page
      .locator('.organize-panel')
      .evaluate((el) => el.getBoundingClientRect().y),
    organizeY,
    'filtering does not move adjacent modules',
  );
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  assert.equal(await page.locator('.file-table tbody tr').count(), 4);
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Select Soft forms', exact: true })
      .isChecked(),
    true,
    'hidden selections survive filtering',
  );
  await page.getByRole('radio', { name: 'grid view', exact: true }).check();
  assert.equal(await page.locator('.file-tile').count(), 4);
  await page
    .getByRole('checkbox', { name: 'Select Daylight', exact: true })
    .check();
  await page.screenshot({ path: new URL('everyday-grid.png', out).pathname });
  await page.getByRole('radio', { name: 'list view', exact: true }).check();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Select Daylight', exact: true })
      .isChecked(),
    true,
  );
  await page
    .getByRole('button', { name: 'Clear selection', exact: true })
    .click();
  assert.match(await page.locator('.selection-count').innerText(), /^00/);
  await page.getByRole('checkbox', { name: 'Later', exact: true }).check();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Ideas', exact: true })
      .isChecked(),
    true,
  );
  await page.getByRole('checkbox', { name: 'Personal', exact: true }).uncheck();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Later', exact: true })
      .isChecked(),
    true,
  );
  const display = page.getByRole('slider', {
    name: 'Screen brightness',
    exact: true,
  });
  await display.focus();
  await display.press('End');
  assert.equal(await display.inputValue(), '100');
  await page
    .getByRole('radio', { name: 'Display profile: moon', exact: true })
    .check();
  await selected('Display profile: moon');
  await page.getByRole('switch', { name: 'Wi-Fi', exact: true }).uncheck();
  assert.equal(
    await page.getByRole('switch', { name: 'Wi-Fi', exact: true }).isChecked(),
    false,
  );
  await page.locator('.workspace-menu summary').click();
  await page
    .getByRole('radio', { name: 'Workspace: Shared', exact: true })
    .check();
  assert.ok(
    (await page.locator('.workspace-menu summary').innerText()).includes(
      'Shared',
    ),
  );
  await page
    .getByRole('button', { name: 'Open calendar', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'November 18, 2026', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page
    .getByRole('button', { name: 'Previous selected day', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'November 17, 2026', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page
    .getByRole('button', { name: 'Star workspace', exact: true })
    .click();
  assert.equal(await page.locator('.workspace-status').innerText(), 'Starred');
  await page
    .getByRole('button', { name: 'Open control center', exact: true })
    .click();
  assert.equal(
    await display.evaluate((el) => el === document.activeElement),
    true,
  );

  const stats = await page.evaluate(() => window.gpuStats);
  assert.equal(stats.devices - stats.destroyed, 1);
  assert.equal(stats.pipelines, 4);
  assert.equal(stats.copies, 0);
  await page.mouse.move(20, 20);
  await settle();
  const idle = await page.evaluate(() => window.gpuStats.submits);
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => window.gpuStats.submits),
    idle,
    'no idle render or simulation clock',
  );
  await page.goBack();
  await ready();
  assert.equal(new URL(page.url()).searchParams.get('object'), 'archive-focus');
  await page.goForward();
  await ready();
  assert.equal(
    new URL(page.url()).searchParams.get('object'),
    'archive-desktop',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page
    .getByRole('radio', { name: 'Display profile: moon', exact: true })
    .check();
  await settle();
  assert.equal(
    await page
      .locator('.system-controls .segment-thumb')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
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
      await page.goto(
        study === 1
          ? `${base}/?study=1`
          : `${base}/?view=library&object=archive-${study === 2 ? 'focus' : 'desktop'}`,
      );
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
      if (viewport.width > 760 && study === 1) {
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
  // Without WebGPU, the analytic card still renders via WebGL2.
  const fallback = await browser.newPage();
  await fallback.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', { get: () => undefined }),
  );
  await fallback.goto(base + '/?view=card');
  await fallback.locator('.card-specimen[data-oyn-active] canvas').waitFor();
  await fallback.close();
  await writeFile(
    new URL(
      `results${process.env.BROWSER === 'firefox' ? '-firefox' : ''}.json`,
      out,
    ),
    JSON.stringify(results, null, 2),
  );
  console.log(
    'PASS: Quiet and both preserved archive compositions; calendar, mixed multi-selection, dropdown keyboard/dismissal, search, sorting, table/grid, shortcuts; four cached pipelines; one live device; idle/reduced-motion; history; 5 responsive sizes; no WebGPU errors; card fallback.',
  );
} finally {
  server?.kill();
  await browser?.close();
}
