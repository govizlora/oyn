import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const label = process.env.CAPTURE ?? "after";
const directory = `test-results/ceramic-continuity/${label}`;
await mkdir(directory, { recursive: true });
const report = [];
// Compare premultiplied RGBA, including alpha: transparent RGB is not visible.
function difference(a, b) {
  assert.equal(a.width, b.width);
  assert.equal(a.height, b.height);
  let total = 0,
    max = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 4; c++) {
      const x = c === 3 ? a.data[i + c] : (a.data[i + c] * a.data[i + 3]) / 255;
      const y = c === 3 ? b.data[i + c] : (b.data[i + c] * b.data[i + 3]) / 255;
      const delta = Math.abs(x - y);
      total += delta;
      max = Math.max(max, delta);
    }
  }
  return { mean: total / a.data.length, max };
}
try {
  for (const [fallback, dpr] of [
    [false, 1],
    [false, 2],
    [true, 1.5],
  ]) {
    const backend = `${fallback ? "webgl2" : "webgpu"}-${dpr}`;
    const page = await browser.newPage({
      viewport: { width: 1180, height: 1560 },
      deviceScaleFactor: dpr,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    if (fallback)
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "gpu", { value: undefined }),
      );
    await page.addInitScript(() => {
      const counts = (window.allocations = { pipelines: 0, buffers: 0 });
      for (const [type, method, key] of [
        [window.GPUDevice, "createRenderPipeline", "pipelines"],
        [window.GPUDevice, "createBuffer", "buffers"],
        [window.WebGL2RenderingContext, "createProgram", "pipelines"],
        [window.WebGL2RenderingContext, "createBuffer", "buffers"],
      ]) {
        if (!type) continue;
        const original = type.prototype[method];
        type.prototype[method] = function (...args) {
          counts[key]++;
          return original.apply(this, args);
        };
      }
    });
    await page.goto(
      server.resolvedUrls.local[0] + "tests/fixtures/ceramic-continuity.html",
    );
    await page.waitForFunction(() => window.continuity?.ready());
    await page.screenshot({
      path: `${directory}/${backend}.png`,
      fullPage: true,
    });
    const captures = await page.evaluate(() => window.continuity.capture());
    for (const name of ["light", "dark", "contrast", "color"]) {
      const samples = captures
        .filter((c) => c.name === name)
        .map((c) => ({
          ...c,
          image: PNG.sync.read(Buffer.from(c.png.split(",")[1], "base64")),
        }));
      const find = (e) => samples.find((s) => s.elevation === e).image;
      const steps = samples.slice(1).map((sample, index) => ({
        from: samples[index].elevation,
        to: sample.elevation,
        ...difference(samples[index].image, sample.image),
      }));
      const nearZero = difference(find(0.001), find(-0.001));
      report.push({ backend, name, nearZero, steps });
      if (!process.env.CAPTURE) {
        assert.ok(
          nearZero.max <= 1,
          `${backend}/${name}: zero crossing ${JSON.stringify(nearZero)}`,
        );
        assert.ok(
          find(0).data.every((value) => value === 0),
          "zero relief must leave its receiver unchanged",
        );
      }
    }
    const ao = captures
      .filter((c) => c.name === "ao" && c.elevation > 0)
      .map((c) => {
        const png = PNG.sync.read(Buffer.from(c.png.split(",")[1], "base64"));
        const y = Math.floor(png.height / 2);
        let mass = 0,
          moment = 0;
        for (let x = 0; x < png.width; x++) {
          const position = (x + 0.5) / c.scale - c.pad;
          const distance = Math.max(-position, position - 112);
          if (distance <= 0) continue;
          const alpha = png.data[4 * (y * png.width + x) + 3] / 255;
          mass += alpha;
          moment += distance * alpha;
        }
        return {
          elevation: c.elevation,
          mass,
          reach: mass ? moment / mass : 0,
        };
      });
    if (!process.env.CAPTURE)
      for (let i = 1; i < ao.length; i++) {
        assert.ok(
          ao[i].mass <= ao[i - 1].mass,
          "AO energy must shrink with the gap",
        );
        assert.ok(
          ao[i].reach <= ao[i - 1].reach + 0.01,
          "AO reach must shrink, not leave a fixed halo",
        );
      }
    // Sample actual setter-driven frames, including exact reversal. This is not
    // a second animation implementation: the test supplies instantaneous numbers.
    const live = await page.evaluate(async () => {
      const samples = window.continuity.samples.filter(
        (s) =>
          ["light", "dark", "contrast"].includes(s.name) && s.elevation === 8,
      );
      const canvases = samples.map((s) => s.element.querySelector("canvas"));
      const original = canvases.map((c) => c.toDataURL());
      const allocations = { ...window.allocations };
      const frames = [];
      const heights = Array.from({ length: 141 }, (_, i) => (80 - i) / 10);
      // Approach every analytic join from either side at subpixel resolution.
      const joins = [-1, 0, 1, 1.5, 3, 4.25, 6];
      heights.push(...joins.flatMap((h) => [h - 0.001, h + 0.001]), 8);
      for (const height of heights) {
        samples.forEach((s) => s.material.setElevation(height));
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        frames.push({ height, pngs: canvases.map((c) => c.toDataURL()) });
      }
      return {
        frames,
        allocations,
        after: window.allocations,
        stable: samples.every(
          (s, i) => s.element.querySelector("canvas") === canvases[i],
        ),
        exactReturn: canvases.every((c, i) => c.toDataURL() === original[i]),
      };
    });
    assert.ok(
      live.stable && live.exactReturn,
      "reversal preserves the canvas and restores exact pixels",
    );
    if (!process.env.CAPTURE)
      assert.deepEqual(
        live.after,
        live.allocations,
        "signed updates must not allocate buffers or pipelines",
      );
    const images = live.frames.map((f) => ({
      height: f.height,
      images: f.pngs.map((png) =>
        PNG.sync.read(Buffer.from(png.split(",")[1], "base64")),
      ),
    }));
    const sweep = images.slice(1, 141).map((f, i) => ({
      from: images[i].height,
      to: f.height,
      deltas: f.images.map((b, j) => difference(images[i].images[j], b)),
    }));
    if (!process.env.CAPTURE)
      assert.ok(
        // Includes pigment coverage changes and AA quantization. The rescaled
        // specular-profile regression flashed by >90 levels per 0.1px step.
        sweep.every((s) => s.deltas.every((d) => d.max < 40)),
        `dense sweep discontinuity: ${JSON.stringify(
          sweep.reduce((a, b) =>
            Math.max(...a.deltas.map((d) => d.max)) >
            Math.max(...b.deltas.map((d) => d.max))
              ? a
              : b,
          ),
        )}`,
      );
    const joins = [];
    for (let i = 141; i < images.length - 1; i += 2) {
      const deltas = images[i].images.map((a, j) =>
        difference(a, images[i + 1].images[j]),
      );
      joins.push({
        height: (images[i].height + images[i + 1].height) / 2,
        deltas,
      });
      if (!process.env.CAPTURE)
        assert.ok(
          deltas.every((d) => d.max <= 3),
          `optical join: ${JSON.stringify(joins.at(-1))}`,
        );
    }
    report.push({ backend, ao, sweep, joins, allocations: live.allocations });
    assert.deepEqual(errors, []);
    await page.close();
  }
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      report
        .filter((r) => r.name)
        .map(({ backend, name, nearZero }) => ({
          backend,
          name,
          nearZero,
        })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
