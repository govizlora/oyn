import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import { createServer } from "vite";
import { chromium } from "playwright";
import { parseWgsl, validate, writeGlsl, nagaVersion } from "naga-wasm";
import { PNG } from "pngjs";

const out = process.env.REPORT_DIR ?? "test-results/webgl-copy";
const rounds = Number(process.env.ROUNDS ?? 3);
const warmupMs = Number(process.env.WARMUP_MS ?? 2000);
const sampleMs = Number(process.env.SAMPLE_MS ?? 5000);
const dprs = (process.env.DPRS ?? "1,2").split(",").map(Number);
const modes = (
  process.env.MODES ??
  "webgpu,webgl-shared,webgl-copy-sequential,webgl-copy-batched"
).split(",");
const cpuThrottle = Number(process.env.CPU_THROTTLE ?? 1);
const viewport = { width: 1680, height: 1050 };
const server = await createServer({
  server: { host: "127.0.0.1", port: 0, strictPort: true },
});
let browser;
const report = {
  date: new Date().toISOString(),
  method:
    "40 fully onscreen cards, production Ceramic WGSL and parameters, animated light and elevation every RAF, 40 draws/frame; existing WebGPU renderer versus generated GLSL ES 300. CPU is JS/API wall time (including possible stalls), NOT GPU time. Copy-call time excludes deferred work; RAF is not a compositor-present measurement. No GPU waits/readback in measured frames. Shader compilation and screenshots excluded. Shared canvas is a performance baseline, not a DOM-correct production backend.",
  host: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model },
  viewport,
  rounds,
  warmupMs,
  sampleMs,
  cpuThrottle,
  nagaVersion,
  shaders: {},
  runs: [],
  visual: [],
};
const percentile = (a, p) =>
  a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)] ?? 0;
const stats = (a) => ({
  p50: percentile(a, 0.5),
  p95: percentile(a, 0.95),
  max: Math.max(0, ...a),
});
const references = new Map();
try {
  await mkdir(out, { recursive: true });
  const sources = {};
  for (const [name, path, exportName, passes] of [
    ["ceramic", "shaders", "ceramicWGSL", ["surface"]],
  ]) {
    const wgsl = (
      await server.ssrLoadModule(`/packages/ceramic/src/${path}.ts`)
    )[exportName];
    const module = parseWgsl(wgsl);
    const info = validate(module);
    const compile = (stage, entryPoint) =>
      writeGlsl(module, info, {
        version: "300 es",
        stage,
        entryPoint,
        reflect: true,
        // Current WGSL already emits clip-space Y-up; don't invert it again.
        flags: { adjustCoordinateSpace: false },
      });
    sources[name] = {
      vertex: compile("vertex", "vertex"),
      fragments: Object.fromEntries(
        passes.map((pass) => [pass, compile("fragment", pass)]),
      ),
    };
    report.shaders[name] = {
      sha256: createHash("sha256").update(wgsl).digest("hex"),
      passes,
    };
    info.free();
    module.free();
  }
  await writeFile(
    `${out}/generated-glsl.json`,
    JSON.stringify(sources, null, 2),
  );
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: "chrome", headless: true });
  report.browser = browser.version();
  const cdp = await browser.newBrowserCDPSession();
  const system = await cdp.send("SystemInfo.getInfo");
  report.gpu = system.gpu;
  for (let round = 0; round < rounds; round++) {
    for (const dpr of dprs) {
      // Rotate ordering between rounds to reduce warm-cache/thermal bias.
      const order = [
        ...modes.slice(round % modes.length),
        ...modes.slice(0, round % modes.length),
      ];
      for (const mode of order) {
        const page = await browser.newPage({
          viewport,
          deviceScaleFactor: dpr,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });
        if (cpuThrottle !== 1)
          await (
            await page.context().newCDPSession(page)
          ).send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
        await page.goto(`${base}/tests/fixtures/webgl-copy.html`);
        await page.waitForFunction(
          () => typeof window.setupWebglCopy === "function",
        );
        const metadata = await page.evaluate(
          async ({ mode, sources }) => {
            window.benchmark = await window.setupWebglCopy(mode, sources);
            return window.benchmark.metadata;
          },
          { mode, sources },
        );
        const raw = await page.evaluate(
          async ({ warmupMs, sampleMs }) =>
            window.benchmark.sample(warmupMs, sampleMs),
          { warmupMs, sampleMs },
        );
        const frames = raw.frames;
        assert.ok(frames.length >= 5, "Insufficient frames");
        const intervals = frames
          .slice(1)
          .map((frame, i) => frame.t - frames[i].t);
        const result = {
          round,
          ...metadata,
          frames: frames.length,
          fps: ((frames.length - 1) * 1000) / (frames.at(-1).t - frames[0].t),
          intervalMs: stats(intervals),
          cpuMs: stats(frames.map((f) => f.cpu)),
          copyCallMs: stats(frames.map((f) => f.copy)),
          over25ms: intervals.filter((t) => t > 25).length / intervals.length,
          longtasks: raw.longtasks,
        };
        report.runs.push(result);
        await writeFile(
          `${out}/raw-${round}-${dpr}-${mode}.json`,
          JSON.stringify(raw),
        );
        if (round === 0) {
          await page.evaluate(() => window.benchmark.freeze());
          const screenshot = await page.screenshot({
            path: `${out}/${mode}-dpr${dpr}.png`,
          });
          const png = PNG.sync.read(screenshot);
          if (mode === "webgpu") references.set(dpr, png);
          else if (references.has(dpr)) {
            const reference = references.get(dpr);
            assert.equal(png.width, reference.width);
            assert.equal(png.height, reference.height);
            let sum = 0,
              different = 0,
              max = 0;
            for (let i = 0; i < png.data.length; i += 4) {
              let delta = 0;
              for (let c = 0; c < 3; c++) {
                const d = Math.abs(png.data[i + c] - reference.data[i + c]);
                delta = Math.max(delta, d);
                sum += d;
                max = Math.max(max, d);
              }
              if (delta > 8) different++;
            }
            const comparison = {
              mode,
              dpr,
              meanChannelError: sum / (png.width * png.height * 3),
              fractionPixelsOver8: different / (png.width * png.height),
              maxChannelError: max,
            };
            report.visual.push(comparison);
            assert.ok(
              comparison.meanChannelError < 1,
              `Visual mismatch: ${JSON.stringify(comparison)}`,
            );
            assert.ok(
              comparison.fractionPixelsOver8 < 0.005,
              `Visual mismatch: ${JSON.stringify(comparison)}`,
            );
          }
        }
        assert.deepEqual(errors, []);
        console.log(
          JSON.stringify({
            round,
            dpr,
            mode,
            fps: +result.fps.toFixed(1),
            cpuP50: result.cpuMs.p50,
            cpuP95: result.cpuMs.p95,
            copyP50: result.copyCallMs.p50,
            intervalP95: result.intervalMs.p95,
          }),
        );
        await page.evaluate(() => window.benchmark.dispose());
        await page.close();
        await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
      }
    }
  }
} finally {
  await browser?.close();
  await server.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
