import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:5192';
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
        '5192',
        '--strictPort',
      ],
      { stdio: 'pipe' },
    );
let ready = !server,
  log = '',
  browser;
server?.stdout.on('data', (d) => {
  if (String(d).includes('Local:')) ready = true;
});
server?.stderr.on('data', (d) => (log += d));
const out = new URL('../test-results/library/', import.meta.url);
await mkdir(out, { recursive: true });
const results = [];
try {
  for (let n = 0; ; n++) {
    if (server && server.exitCode !== null)
      throw Error(log || 'Preview exited');
    try {
      if (ready && (await fetch(base)).ok) break;
    } catch {}
    if (n > 100) throw Error(log || 'Preview did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', async (m) => {
    if (m.type() === 'error')
      for (const arg of m.args())
        errors.push(await arg.evaluate((v) => v?.message ?? String(v)));
  });
  await page.addInitScript(() => {
    window.gpuStats = {
      devices: 0,
      destroyed: 0,
      pipelines: 0,
      submits: 0,
      copies: 0,
    };
    const wrap = (proto, name, key) => {
      const original = proto[name];
      proto[name] = function (...args) {
        window.gpuStats[key]++;
        return original.apply(this, args);
      };
    };
    if (!window.GPUAdapter) return;
    wrap(GPUAdapter.prototype, 'requestDevice', 'devices');
    wrap(GPUDevice.prototype, 'destroy', 'destroyed');
    wrap(GPUDevice.prototype, 'createRenderPipeline', 'pipelines');
    wrap(GPUQueue.prototype, 'submit', 'submits');
    wrap(CanvasRenderingContext2D.prototype, 'drawImage', 'copies');
  });
  const settle = () =>
    page.evaluate(async () => {
      await Promise.all(
        document.getAnimations().map((a) => a.finished.catch(() => {})),
      );
      for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
    });
  const room = async (name) => {
    await page
      .getByRole('navigation', { name: 'Object rooms' })
      .getByRole('button', { name: new RegExp(`^${name}`) })
      .click();
    await settle();
  };
  const spec = (id) => page.locator(`[data-object="${id}"]`);
  const slider = (label) =>
    page.getByRole('slider', { name: label, exact: true });
  const setRange = async (label, n) => {
    const input = slider(label);
    await input.fill(String(n));
    await settle();
  };
  const press = async (label, key) => {
    await slider(label).focus();
    await slider(label).press(key);
  };
  await page.goto(base + '/?view=library&room=controls');
  await page.waitForSelector('.specimen-stage canvas');
  await settle();
  assert.equal(await page.locator('.library-specimen').count(), 6);
  await press('Aperture', 'End');
  assert.equal(await slider('Aperture').inputValue(), '100');
  await page
    .getByRole('switch', { name: 'Notifications', exact: true })
    .check();
  await page.getByRole('checkbox', { name: 'Future', exact: true }).check();
  assert.match(await spec('many-choices').innerText(), /03/);
  await press('Lower bound', 'End');
  assert.equal(await slider('Lower bound').inputValue(), '76');
  await press('Upper bound', 'Home');
  assert.equal(await slider('Upper bound').inputValue(), '76');
  await press('Lower bound', 'Home');
  await press('Upper bound', 'End');
  const track = await spec('interval').locator('.obj-interval').boundingBox(),
    thumb = await slider('Upper bound').boundingBox();
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    track.x + track.width * 0.6,
    thumb.y + thumb.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  assert.ok(
    Math.abs(Number(await slider('Upper bound').inputValue()) - 60) <= 1,
  );
  await press('Upper bound', 'End');
  await press('Lower bound', 'End');
  const collapsed = await slider('Lower bound').boundingBox();
  await page.mouse.move(
    collapsed.x + collapsed.width / 2,
    collapsed.y + collapsed.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    track.x + track.width * 0.9,
    collapsed.y + collapsed.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  assert.ok(
    Math.abs(Number(await slider('Lower bound').inputValue()) - 90) <= 1,
    'collapsed upper endpoint remains draggable',
  );
  await page
    .getByRole('button', { name: 'Increase quantity', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Quantity', exact: true })
      .inputValue(),
    '13',
  );
  await page.getByRole('radio', { name: '5 stars', exact: true }).check();
  assert.equal(
    await page.getByRole('radio', { name: '5 stars', exact: true }).isChecked(),
    true,
  );
  await page
    .getByRole('button', { name: 'Pick Aperture dial', exact: true })
    .click();
  await room('Navigate');
  await page.getByRole('tab', { name: 'Objects', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page
      .getByRole('tab', { name: 'Notes', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  assert.equal(
    await page
      .getByRole('tab', { name: 'Page 1', exact: true })
      .getAttribute('aria-selected'),
    'true',
  );
  await page.getByRole('button', { name: 'Close page', exact: true }).click();
  assert.equal(
    await page.getByRole('tab', { name: 'Page 1', exact: true }).count(),
    0,
  );
  await page.getByRole('radio', { name: 'Page: 5', exact: true }).check();
  assert.match(await spec('pagination').innerText(), /05/);
  await spec('breadcrumbs')
    .getByRole('button', { name: 'Home', exact: true })
    .click();
  assert.match(await spec('breadcrumbs').innerText(), /Open Studio/);
  await spec('folder-tree')
    .getByRole('button', { name: 'Light', exact: false })
    .click();
  assert.match(await spec('folder-tree').innerText(), /Selected \/ Light/);
  await page
    .getByRole('searchbox', { name: 'Find command', exact: true })
    .fill('arrange');
  await page
    .getByRole('searchbox', { name: 'Find command', exact: true })
    .press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.match(
    await spec('command-search').innerText(),
    /Preview \/ Arrange windows/,
  );
  await spec('app-dock')
    .getByRole('button', { name: 'Open Settings', exact: true })
    .click();
  assert.equal(
    await spec('app-dock').locator('.obj-dock-window strong').innerText(),
    'Settings',
  );
  await room('Make');
  const orb = spec('palette').locator('.obj-color-orb');
  await settle();
  const before = await orb.screenshot();
  await page
    .getByLabel('Custom ceramic color', { exact: true })
    .fill('#68aabb');
  await settle();
  assert.equal(await spec('palette').locator('output').innerText(), '#68AABB');
  assert.ok(
    !before.equals(await orb.screenshot()),
    'custom color changes actual GPU pixels',
  );
  await page
    .getByRole('textbox', { name: 'Type specimen', exact: true })
    .fill('Oo');
  await setRange('Weight', 90);
  assert.equal(
    await spec('type').locator('.obj-type-preview').innerText(),
    'Oo',
  );
  await page
    .getByRole('radio', { name: 'Alignment: Right', exact: true })
    .check();
  assert.equal(
    await spec('alignment')
      .locator('.obj-ink-lines')
      .getAttribute('data-align'),
    'Right',
  );
  await page.getByRole('radio', { name: 'Columns: 6', exact: true }).check();
  assert.equal(
    await spec('grid')
      .locator('.obj-layout-grid')
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
      ),
    6,
  );
  await setRange('Roundness', 0);
  await setRange('Elevation', 100);
  assert.equal(
    await spec('corners')
      .locator('.obj-corner-sample')
      .evaluate((el) => getComputedStyle(el).borderRadius),
    '0px',
  );
  await page
    .getByRole('radio', { name: 'Aspect ratio: 16:9', exact: true })
    .check();
  assert.equal(
    await spec('crop')
      .locator('.obj-crop')
      .evaluate((el) => getComputedStyle(el).aspectRatio),
    '16 / 9',
  );
  await page
    .getByRole('button', { name: 'Pick Soft geometry', exact: true })
    .click();
  await room('Arrange');
  await page
    .getByRole('button', { name: 'Move selected up', exact: true })
    .click();
  assert.match(
    await spec('ordered-list').locator('li').first().innerText(),
    /Explore/,
  );
  await page
    .getByRole('checkbox', { name: 'Complete Explore', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Move Shape to Now', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Move Shape to Done', exact: true })
      .count(),
    1,
  );
  await page.getByLabel('Choose local files', { exact: true }).setInputFiles({
    name: 'local-test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Local metadata only'),
  });
  assert.match(await spec('local-files').innerText(), /local-test.txt/);
  await page
    .getByRole('textbox', { name: 'New tag', exact: true })
    .fill('tomorrow');
  await page
    .getByRole('textbox', { name: 'New tag', exact: true })
    .press('Enter');
  assert.equal(
    await page
      .getByRole('button', { name: 'Remove tomorrow', exact: true })
      .count(),
    1,
  );
  await page
    .getByRole('button', { name: 'Remove tomorrow', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Note', exact: true })
    .fill('Build something beautiful.');
  await page.getByRole('radio', { name: 'Paper: Lilac', exact: true }).check();
  assert.equal(
    await page.getByRole('textbox', { name: 'Note', exact: true }).inputValue(),
    'Build something beautiful.',
  );
  await spec('folder-stack')
    .getByRole('button', { name: 'Archive', exact: true })
    .click();
  assert.match(await spec('folder-stack').innerText(), /Early forms/);
  await room('Respond');
  await page
    .getByRole('button', { name: 'Dismiss notification 1', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Dismiss notification 1', exact: true })
      .count(),
    0,
  );
  await page.getByRole('button', { name: 'Undo dismiss', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Dismiss notification 1', exact: true })
      .count(),
    1,
  );
  await page
    .getByRole('button', { name: 'Advance progress', exact: true })
    .click();
  assert.match(await spec('progress').locator('output').innerText(), /72/);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  assert.equal(
    await spec('workflow').locator('button[aria-current=step]').innerText(),
    '3\nReview',
  );
  await spec('storage')
    .getByRole('button', { name: 'Images: 28 gigabytes', exact: true })
    .click();
  assert.match(
    await spec('storage').locator('.obj-readout').innerText(),
    /28 GB\nImages/,
  );
  const permission = page.getByRole('checkbox', {
    name: 'All permissions',
    exact: true,
  });
  assert.equal(await permission.evaluate((el) => el.indeterminate), true);
  await permission.check();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Invite permission', exact: true })
      .isChecked(),
    true,
  );
  await page
    .getByRole('textbox', { name: 'Email address', exact: true })
    .fill('not-an-email');
  await page
    .getByRole('button', { name: 'Check invitation', exact: false })
    .click();
  assert.equal(
    await spec('validation').getByRole('status').innerText(),
    'Local validation · no email is sent',
  );
  await page
    .getByRole('textbox', { name: 'Email address', exact: true })
    .fill('test@example.com');
  await page
    .getByRole('button', { name: 'Check invitation', exact: false })
    .click();
  assert.equal(
    await spec('validation').getByRole('status').innerText(),
    'Viewer · ready, not sent',
  );
  await room('Time');
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
  await page.getByLabel('From', { exact: true }).fill('2026-12-01');
  assert.equal(
    await page.getByLabel('Until', { exact: true }).inputValue(),
    '2026-12-01',
  );
  await page.getByRole('radio', { name: 'Weekday: Fri', exact: true }).check();
  await page.getByRole('radio', { name: '16:00 slot', exact: true }).check();
  assert.match(await spec('week-slots').innerText(), /16:00\nFri/);
  await page.getByLabel('Time', { exact: true }).fill('23:15');
  assert.equal(
    await page
      .getByRole('radio', { name: 'Period: PM', exact: true })
      .isChecked(),
    true,
  );
  await page.getByRole('radio', { name: 'Period: AM', exact: true }).check();
  assert.equal(
    await page.getByLabel('Time', { exact: true }).inputValue(),
    '11:15',
  );
  await page
    .getByRole('radio', { name: 'City: Vancouver', exact: true })
    .check();
  assert.equal(
    await spec('world-clock').locator('.obj-clock small').innerText(),
    await page.evaluate(() =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Vancouver',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date('2026-11-18T12:00:00Z')),
    ),
  );
  await page
    .getByRole('button', { name: 'Activity day 7', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Activity day 7', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await room('Play');
  const screen = spec('terminal').locator('.phosphor');
  await settle();
  const oldCode = await screen.screenshot();
  await page
    .getByRole('textbox', { name: 'Terminal text', exact: true })
    .fill('HELLO\nFUTURE');
  await settle();
  assert.equal(await screen.locator('pre').textContent(), 'HELLO\nFUTURE');
  assert.ok(
    !oldCode.equals(await screen.screenshot()),
    'live text changes actual shader glyphs',
  );
  await spec('pixels')
    .getByRole('button', { name: 'Clear', exact: true })
    .click();
  assert.equal(await spec('pixels').locator('[aria-pressed=true]').count(), 0);
  await page.getByRole('button', { name: 'Pixel 1, 1', exact: true }).click();
  assert.equal(await spec('pixels').locator('[aria-pressed=true]').count(), 1);
  await setRange('Horizontal position', 20);
  await setRange('Vertical position', 80);
  assert.equal(
    await spec('position').locator('.obj-position-coordinates').innerText(),
    '20 / 80',
  );
  const calc = spec('calculator').getByRole('group', {
    name: 'Calculator keyboard',
    exact: true,
  });
  await calc.focus();
  await page.keyboard.type('12+7');
  await page.keyboard.press('Enter');
  assert.equal(await spec('calculator').locator('output').innerText(), '19');
  await page.keyboard.type('/0');
  await page.keyboard.press('Enter');
  assert.equal(await spec('calculator').locator('output').innerText(), 'Error');
  await page.keyboard.press('Escape');
  assert.equal(await spec('calculator').locator('output').innerText(), '0');
  await page
    .getByRole('button', { name: 'Tally plus one', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Tally value', exact: true })
      .inputValue(),
    '129',
  );
  await page.getByLabel('Six digit code', { exact: true }).fill('12ab34');
  assert.equal(
    await page.getByLabel('Six digit code', { exact: true }).inputValue(),
    '1234',
  );
  await page.getByRole('button', { name: 'Show digits', exact: true }).click();
  assert.equal(
    await page
      .getByLabel('Six digit code', { exact: true })
      .getAttribute('type'),
    'text',
  );
  await page
    .getByRole('button', { name: 'Pick Phosphor paper', exact: true })
    .click();
  await room('Everyday');
  await spec('option-capsule').locator('summary').click();
  await page
    .getByRole('radio', { name: 'Collection: Personal', exact: true })
    .check();
  assert.equal(
    await spec('option-capsule')
      .locator('details')
      .evaluate((el) => el.open),
    false,
  );
  assert.match(
    await spec('option-capsule').locator('summary').innerText(),
    /Personal/,
  );
  await spec('filter-pocket').locator('summary').click();
  await page
    .getByRole('checkbox', { name: 'Include Notes', exact: true })
    .check();
  assert.equal(
    await spec('filter-pocket')
      .locator('details')
      .evaluate((el) => el.open),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await spec('filter-pocket')
      .locator('details')
      .evaluate((el) => el.open),
    false,
  );
  const tableAll = spec('raised-table').getByRole('checkbox', {
    name: 'Select all visible files',
    exact: true,
  });
  assert.equal(await tableAll.evaluate((el) => el.indeterminate), true);
  await tableAll.check();
  await spec('raised-table')
    .getByRole('radio', { name: 'grid view', exact: true })
    .check();
  assert.equal(await spec('raised-table').locator('.file-tile').count(), 4);
  await spec('raised-table')
    .getByRole('searchbox', { name: 'Find files', exact: true })
    .fill('notes');
  assert.equal(await spec('raised-table').locator('.file-tile').count(), 1);
  await page
    .getByRole('button', { name: 'Compact window', exact: true })
    .click();
  assert.equal(
    await spec('window-things').locator('.obj-window-body').count(),
    0,
  );
  await page
    .getByRole('button', { name: 'Expand window', exact: true })
    .click();
  assert.equal(
    await spec('window-things')
      .locator('.obj-window')
      .getAttribute('data-mode'),
    'wide',
  );
  await spec('folded-paper')
    .locator('summary')
    .filter({ hasText: 'Interaction' })
    .click();
  assert.equal(
    await spec('folded-paper')
      .locator('details')
      .first()
      .evaluate((el) => el.open),
    false,
  );
  assert.equal(
    await spec('folded-paper')
      .locator('details')
      .nth(1)
      .evaluate((el) => el.open),
    true,
  );
  await page
    .getByRole('spinbutton', { name: 'Frame width', exact: true })
    .fill('150');
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Frame height', exact: true })
      .inputValue(),
    '100',
  );
  await page
    .getByRole('switch', { name: 'Lock proportions', exact: true })
    .uncheck();
  await page
    .getByRole('spinbutton', { name: 'Frame width', exact: true })
    .fill('60');
  assert.equal(
    await page
      .getByRole('spinbutton', { name: 'Frame height', exact: true })
      .inputValue(),
    '100',
  );
  const gpu = await page.evaluate(() => window.gpuStats);
  assert.equal(gpu.devices - gpu.destroyed, 1);
  assert.equal(gpu.pipelines, 4);
  assert.equal(gpu.copies, 0);
  results.push({ interactions: '48 specimens passed', gpu });
  await room('Hardware');
  await spec('moving-air')
    .getByRole('button', { name: 'Rotor power', exact: true })
    .click();
  await setRange('Rotor speed', 0);
  assert.equal(
    await spec('moving-air').getByRole('img').getAttribute('aria-label'),
    'Rotor, stopped, 5 blades',
  );
  await spec('light-bank')
    .getByRole('button', { name: 'Lamp 2', exact: true })
    .click();
  assert.equal(
    await spec('light-bank')
      .getByRole('button', { name: 'Lamp 2', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await setRange('Lamp intensity', 30);
  await page
    .getByRole('radio', { name: 'Detent position: 3', exact: true })
    .check();
  assert.equal(
    await spec('three-positions')
      .locator('.detent-readout i[data-on="true"]')
      .count(),
    1,
  );
  await page.getByRole('button', { name: 'Key F', exact: true }).click();
  assert.equal(await spec('little-keys').locator('output').innerText(), 'F');
  await page
    .getByRole('button', { name: 'Send spark reaction', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Change second bubble: spark', exact: true })
      .count(),
    1,
  );
  await page.getByRole('checkbox', { name: 'Pill moon', exact: true }).check();
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Pill sun', exact: true })
      .isChecked(),
    true,
  );
  await room('Archive');
  assert.equal(
    await page.locator('.library-specimen[data-layout="composition"]').count(),
    2,
  );
  assert.equal(await page.locator('.task-list').count(), 1);
  assert.equal(await page.locator('.file-table').count(), 1);
  assert.equal((await page.evaluate(() => window.gpuStats)).pipelines, 5);
  results.push({
    interactions: '6 hardware objects and 2 preserved compositions passed',
  });
  await page.getByRole('button', { name: /^Picked/ }).click();
  assert.equal(await page.locator('.library-specimen').count(), 3);
  assert.deepEqual(
    await page
      .locator('.library-specimen')
      .evaluateAll((els) => els.map((el) => el.dataset.object)),
    ['aperture', 'corners', 'terminal'],
  );
  await page.reload();
  await page.waitForSelector('.specimen-stage canvas');
  assert.equal(
    await page.locator('.library-specimen').count(),
    3,
    'picks persist through reload',
  );
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('button', { name: 'Export selection', exact: false })
      .click(),
  ]);
  await download.saveAs(new URL('selection.json', out).pathname);
  const manifest = JSON.parse(
    await readFile(new URL('selection.json', out), 'utf8'),
  );
  assert.equal(manifest.version, 1);
  assert.equal(manifest.objects.length, 3);
  assert.equal(manifest.objects[2].export, 'LiveTerminal');
  await page
    .getByRole('button', { name: 'Inspect Phosphor paper', exact: true })
    .click();
  assert.equal(await page.locator('.library-specimen').count(), 1);
  assert.equal(new URL(page.url()).searchParams.get('object'), 'terminal');
  await page.goBack();
  await settle();
  assert.equal(await page.locator('.library-specimen').count(), 3);
  await room('Touch');
  await page.locator('.library-heading h1').click();
  await page.keyboard.press('/');
  assert.equal(
    await page
      .getByRole('searchbox', { name: 'Search object library', exact: true })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.type('calculator');
  assert.equal(
    await page.locator('.library-specimen').count(),
    1,
    'catalog search reaches other rooms',
  );
  assert.equal(
    await page.locator('.library-specimen').getAttribute('data-object'),
    'calculator',
  );
  await room('All objects');
  const allIds = [];
  for (let p = 0; p < 10; p++) {
    await settle();
    allIds.push(
      ...(await page
        .locator('.library-specimen')
        .evaluateAll((els) => els.map((el) => el.dataset.object))),
    );
    assert.ok((await page.locator('.library-specimen').count()) <= 6);
    if (p < 9)
      await page
        .getByRole('button', { name: 'Next library page', exact: true })
        .click();
  }
  assert.equal(new Set(allIds).size, 56);
  await page
    .getByRole('link', { name: 'Quiet', exact: true })
    .click();
  await settle();
  assert.equal(await page.locator('.instrument').count(), 1);
  assert.equal(await page.locator('.library-shell').count(), 0);
  await page.getByRole('link', { name: /Object library/ }).click();
  await settle();
  assert.equal(await page.locator('.library-specimen').count(), 6);
  const rooms = [
    'controls',
    'navigation',
    'studio',
    'organize',
    'feedback',
    'time',
    'curiosities',
    'systems',
    'hardware',
    'archive',
  ];
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const name of rooms) {
      await page.goto(`${base}/?view=library&room=${name}`);
      await page.waitForSelector('.specimen-stage canvas');
      await settle();
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        canvases: document.querySelectorAll('canvas').length,
        outside: [
          ...document.querySelectorAll(
            '.specimen-stage button,.specimen-stage input,.specimen-stage textarea',
          ),
        ]
          .filter((el) => {
            const b = el.getBoundingClientRect(),
              p = el.closest('.library-specimen').getBoundingClientRect();
            return (
              el.checkVisibility() &&
              b.width > 0 &&
              (b.left < p.left - 1 ||
                b.right > p.right + 1 ||
                b.bottom > p.bottom + 1)
            );
          })
          .map((el) => el.getAttribute('aria-label') || el.textContent),
      }));
      assert.ok(
        geometry.scrollWidth <= width,
        `no horizontal overflow: ${name} ${width}`,
      );
      assert.deepEqual(
        geometry.outside,
        [],
        `controls fit their specimen: ${name} ${width}`,
      );
      await page.screenshot({
        path: new URL(`${name}-${width}.png`, out).pathname,
        fullPage: true,
      });
      results.push({ room: name, width, geometry });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/?view=library&room=curiosities`);
  await page.waitForSelector('.specimen-stage canvas');
  await settle();
  await page.mouse.move(1, 1);
  await settle();
  const idle = await page.evaluate(() => window.gpuStats.submits);
  await page.waitForTimeout(350);
  assert.equal(
    await page.evaluate(() => window.gpuStats.submits),
    idle,
    'no idle animation clock',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page
      .locator('.object-demo .fader-thumb')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    '0s',
  );
  assert.deepEqual(errors, []);
  const blockedStorage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await blockedStorage.addInitScript(() => {
    Storage.prototype.getItem = function () {
      throw new Error('Storage unavailable');
    };
    Storage.prototype.setItem = function () {
      throw new Error('Storage unavailable');
    };
  });
  await blockedStorage.goto(`${base}/?view=library`);
  await blockedStorage.waitForSelector('.specimen-stage canvas');
  await blockedStorage
    .getByRole('button', { name: 'Pick Aperture dial', exact: true })
    .click();
  assert.match(
    await blockedStorage.locator('.library-footer').innerText(),
    /1 picked \/ this visit only/,
  );
  assert.match(
    await blockedStorage.locator('.library-notice').innerText(),
    /Browser storage is unavailable/,
  );
  await blockedStorage.close();
  const unavailable = await browser.newPage();
  await unavailable.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', { value: undefined }),
  );
  await unavailable.goto(`${base}/?view=library`);
  await unavailable.waitForSelector('[role=alert]');
  assert.equal(await unavailable.locator('canvas').count(), 0);
  await unavailable.close();
  await writeFile(
    new URL('results.json', out),
    JSON.stringify(results, null, 2),
  );
  console.log(
    'PASS: 54 interactive objects + 2 preserved compositions; 10 rooms; persistent picks/export/inspection/history; real shader text and custom colors; one GPU device/zero copies; 30 responsive screenshots; idle/reduced-motion; explicit unsupported state.',
  );
} finally {
  server?.kill('SIGTERM');
  await browser?.close();
}
