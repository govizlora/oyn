// Audit probe, not a passing equivalence assertion: records current representation-dependent differences.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5196',
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch('http://127.0.0.1:5196')).ok) break;
    } catch {}
    if (i === 79) throw Error('Server failed');
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.goto('http://127.0.0.1:5196/tests/fixtures/surface.html');
  const captures = await page.evaluate(async () => {
    const { createEngine } = await import('/packages/surface/src/engine.ts');
    const { solidCeramic } =
      await import('/tests/fixtures/runtime-solid.ts');
    const a = {
      kind: 'card',
      center: [0, 0, 8],
      halfSize: [140, 80, 8],
      radius: 24,
      bevel: 3,
    };
    const cases = [
      ['A', a],
      ['union-A-A', { kind: 'union', a, b: a }],
      [
        'subtract-disjoint',
        {
          kind: 'subtract',
          a,
          b: { kind: 'sphere', center: [0, 0, 100], radius: 1 },
        },
      ],
    ];
    const host = document.createElement('div');
    host.style.cssText =
      'position:absolute;left:250px;top:220px;width:280px;height:160px';
    document.body.append(host);
    const results = [];
    for (const [name, shape] of cases) {
      const material = solidCeramic(shape, { extent: [280, 160], ceiling: 40 });
      const failures = [];
      const engine = createEngine(
        new Map([[host, { element: host, material, initialBudget: 40 }]]),
        (e) => failures.push(String(e)),
      );
      try {
        for (
          let i = 0;
          !host.querySelector('canvas') && !failures.length;
          i++
        ) {
          if (i > 200) throw Error('Timeout');
          await new Promise(requestAnimationFrame);
        }
        window.dispatchEvent(
          new PointerEvent('pointermove', { clientX: 180, clientY: 120 }),
        );
        for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
        if (failures.length) throw Error(failures.join('\n'));
        results.push({ name, image: host.querySelector('canvas').toDataURL() });
      } finally {
        engine.dispose();
      }
    }
    return results;
  });
  await mkdir('test-results/ceramic-scale', { recursive: true });
  const images = captures.map((c) =>
      PNG.sync.read(Buffer.from(c.image.split(',')[1], 'base64')),
    ),
    base = images[0],
    pad = (base.width - 280) / 2,
    padY = (base.height - 160) / 2;
  const report = [];
  for (let j = 1; j < images.length; j++) {
    const b = images[j];
    let max = 0,
      total = 0,
      pixels = 0;
    for (let y = padY; y < padY + 160; y++)
      for (let x = pad; x < pad + 280; x++) {
        let changed = false;
        for (let c = 0; c < 4; c++) {
          const i = (y * base.width + x) * 4 + c,
            d = Math.abs(base.data[i] - b.data[i]);
          max = Math.max(max, d);
          total += d;
          changed ||= d > 0;
        }
        if (changed) pixels++;
      }
    report.push({
      comparison: captures[j].name,
      facePixels: 280 * 160,
      changedPixels: pixels,
      changedPercent: (pixels / (280 * 160)) * 100,
      maxChannelDifference: max,
      meanChannelDifference: total / (280 * 160 * 4),
    });
  }
  console.log(JSON.stringify(report, null, 2));
  await writeFile(
    'test-results/ceramic-scale/identity.json',
    JSON.stringify(report, null, 2),
  );
  for (const capture of captures)
    await writeFile(
      `test-results/ceramic-scale/${capture.name}.png`,
      Buffer.from(capture.image.split(',')[1], 'base64'),
    );
} finally {
  await browser?.close();
  server.kill();
}
