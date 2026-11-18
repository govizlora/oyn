import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const fixture = await readFile(
  new URL('./fixtures/ceramic-before-separation.wgsl', import.meta.url),
  'utf8',
);
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5198',
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5198')).ok) break;
    } catch {}
    if (i === 79) throw Error('Vite did not start');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 900, height: 700 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('http://127.0.0.1:5198/tests/fixtures/surface.html');
  const results = await page.evaluate(async (reference) => {
    const { createCeramicMaterial } = await import('/packages/ceramic/src/index.ts');
    const { cardCeramic } =
      await import('/packages/ceramic/src/card.ts');
    const { createEngine } = await import('/packages/surface/src/engine.ts');
    const settle = async () => {
      for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame);
    };
    const host = document.createElement('div');
    host.style.cssText =
      'position:absolute;left:250px;top:220px;width:280px;height:160px';
    document.body.append(host);
    const results = [];
    for (const colorScheme of ['light', 'dark'])
      for (const [radius, elevation, pointer] of [
        [0, 8, [100, 100]],
        [24, 16, [180, 120]],
        [64, 40, [800, 600]],
        [24, 16, [390, 300]],
      ]) {
        host.style.borderRadius = `${radius}px`;
        const options = { colorScheme, elevation, maxElevation: 40 };
        const material = createCeramicMaterial(options);
        const mesh = {
          element: host,
          // Frozen legacy surface remains the reference; shadow changes are intentional.
          material: { ...material, shader: reference, passes: ['surface'] },
        };
        const meshes = new Map([[host, mesh]]);
        const failures = [];
        const engine = createEngine(meshes, (e) => failures.push(String(e)));
        try {
          for (
            let i = 0;
            !host.querySelector('canvas') && !failures.length;
            i++
          ) {
            if (i > 200) throw Error('Canvas timeout');
            await new Promise(requestAnimationFrame);
          }
          window.dispatchEvent(
            new PointerEvent('pointermove', {
              clientX: pointer[0],
              clientY: pointer[1],
            }),
          );
          await settle();
          if (failures.length) throw Error(failures.join('\n'));
          const before = host.querySelector('canvas').toDataURL();
          mesh.material = {...material,passes:['surface']};
          engine.invalidate();
          await settle();
          if (failures.length) throw Error(failures.join('\n'));
          const after = host.querySelector('canvas').toDataURL();
          const card=cardCeramic({width:280,height:160,radius,elevation,maxElevation:40,finish:{colorScheme}});
          mesh.material = {...card,passes:['surface']};
          engine.invalidate();
          await settle();
          if (failures.length) throw Error(failures.join('\n'));
          const solid=host.querySelector('canvas').toDataURL();
          mesh.material=material;engine.invalidate();await settle();
          const productionFull=host.querySelector('canvas').toDataURL();
          mesh.material=card;engine.invalidate();await settle();
          if(failures.length)throw Error(failures.join('\n'));
          const adaptedFull=host.querySelector('canvas').toDataURL();
          results.push({
            colorScheme,
            radius,
            elevation,
            before,
            after,
            solid,productionFull,adaptedFull,
          });
        } finally {
          engine.dispose();
        }
      }
    return results;
  }, fixture);
  await mkdir('test-results/ceramic-compatibility', { recursive: true });
  const report = [];
  for(const r of results)assert.deepEqual(
    PNG.sync.read(Buffer.from(r.productionFull.split(',')[1],'base64')).data,
    PNG.sync.read(Buffer.from(r.adaptedFull.split(',')[1],'base64')).data,
    'Production and explicit card adapter must match including four-layer shadows');
  for (const r of results)
    for (const path of ['after', 'solid']) {
      const a = PNG.sync.read(Buffer.from(r.before.split(',')[1], 'base64')),
        b = PNG.sync.read(Buffer.from(r[path].split(',')[1], 'base64'));
      assert.equal(a.width, b.width);
      assert.equal(a.height, b.height);
      let max = 0,
        total = 0,
        count = 0;
      for (let i = 0; i < a.data.length; i++) {
        const d = Math.abs(a.data[i] - b.data[i]);
        max = Math.max(max, d);
        total += d;
        if (d) count++;
      }
      console.log(
        JSON.stringify({
          path,
          colorScheme: r.colorScheme,
          radius: r.radius,
          elevation: r.elevation,
          max,
          mean: total / a.data.length,
          changed: count,
        }),
      );
      report.push({
        path,
        colorScheme: r.colorScheme,
        radius: r.radius,
        elevation: r.elevation,
        max,
        changed: count,
        mean: total / a.data.length,
      });
      assert.ok(
        max <= 1,
        'Surface lighting must preserve frozen reference output within one quantization level',
      );
    }

  await writeFile(
    'test-results/ceramic-compatibility/report.json',
    JSON.stringify(report, null, 2),
  );
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  server.kill();
}
