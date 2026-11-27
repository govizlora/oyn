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
      // PNG stores unassociated RGB. Reconstruct the actual 8-bit compositing
      // channels, not fractional values introduced by PNG unpremultiplication.
      const delta = Math.abs(Math.round(x) - Math.round(y));
      total += delta;
      max = Math.max(max, delta);
    }
  }
  return { mean: total / a.data.length, max };
}
try {
  for (const dpr of [1, 2]) {
    const backend = `webgpu-${dpr}`;
    const page = await browser.newPage({
      viewport: { width: 1180, height: 1560 },
      deviceScaleFactor: dpr,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(() => {
      const counts = (window.allocations = { pipelines: 0, buffers: 0 });
      for (const [type, method, key] of [
        [window.GPUDevice, "createRenderPipeline", "pipelines"],
        [window.GPUDevice, "createBuffer", "buffers"],
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
    await page.waitForFunction(() => window.continuity?.ready() || window.continuity?.engine.failed);
    assert.equal(await page.evaluate(() => window.continuity.engine.failed), false, errors.join("\n"));
    await page.screenshot({
      path: `${directory}/${backend}.png`,
      fullPage: true,
    });
    const captures = await page.evaluate(() => window.continuity.capture());
    for (const name of ["light", "dark", "contrast", "color", "clear", "frost"]) {
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
        const flat = find(0);
        const center = (png) => {
          const i =
            4 *
            (Math.floor(png.height / 2) * png.width +
              Math.floor(png.width / 2));
          return [...png.data.subarray(i, i + 4)];
        };
        if (name === "clear" || name === "frost") {
          assert.ok(
            flat.data.every((v) => v === 0),
            "no pigment or relief at zero",
          );
          for (const { image, elevation } of samples) {
            if (elevation >= 0) assert.equal(center(image)[3], 0);
          }
          const shallow = center(find(-2));
          const deep = center(find(-6));
          assert.ok(shallow[3] > 0 && deep[3] > shallow[3],
            "recess depth increases the overlay alpha without pigment");
          const channel = name === "clear" ? 0 : 255;
          assert.deepEqual(deep.slice(0, 3), [channel, channel, channel]);
          if (name === "clear")
            assert.ok(
              find(8).data.some((v, i) => i % 4 === 3 && v > 0),
              "clear relief still has edges",
            );
        } else {
          const rgb = {
            light: [240, 240, 240],
            dark: [12, 12, 12],
            contrast: [23, 23, 23],
            color: [181, 99, 56],
          }[name];
          assert.deepEqual(
            center(flat),
            [...rgb, 255],
            "flat face retains its pigment",
          );
          for (const { image } of samples)
            assert.equal(
              center(image)[3],
              255,
              "pigment never fades at any depth",
            );
        }
      }
    }
    // Isolate the production ground light: no pigment, specular, Fresnel or shadows.
    const glow = captures.filter((c) => c.name === "frost");
    const alphaAt = (height, outside) => {
      const c = glow.find((s) => s.elevation === height);
      const png = PNG.sync.read(Buffer.from(c.png.split(",")[1], "base64"));
      const x = Math.floor((c.pad - outside) * c.scale),
        y = Math.floor(png.height / 2);
      return png.data[4 * (y * png.width + x) + 3];
    };
    assert.equal(alphaAt(8, 1), 0, "no exterior glow before hover");
    for (const h of [-3.2, 0, 2, 4, 8]) {
      const host = page.locator(`[data-frost-height="${h}"]`);
      await host.hover();
      const hovered = await host.evaluate(async (el) => {
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        return window.continuity.capture(el)[0];
      });
      Object.assign(
        glow.find((c) => c.elevation === h),
        hovered,
      );
      if (h >= 0)
        assert.equal(
          alphaAt(h, -2),
          0,
          "ground light cannot leak into the face",
        );
      if (h <= 0)
        assert.equal(
          alphaAt(h, 2),
          0,
          "recessed/flat surfaces cannot light the ground",
        );
    }
    assert.ok(
      alphaAt(8, 1) > alphaAt(4, 1) && alphaAt(4, 1) > alphaAt(2, 1),
      "lift brightens the receiver",
    );
    assert.ok(
      alphaAt(8, 3) > alphaAt(4, 3) && alphaAt(4, 3) === 0,
      "lift widens the footprint",
    );
    // The fixed main lamp in this fixture must not pin the independent backlight.
    const raised = page.locator('[data-frost-height="8"]');
    const box = await raised.boundingBox();
    const sampleEntry = async (inset) => {
      await page.mouse.move(box.x + inset, box.y + box.height / 2);
      const current = await raised.evaluate(async el => {
        await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
        return window.continuity.capture(el)[0];
      });
      Object.assign(glow.find(c=>c.elevation===8), current);
      return alphaAt(8, 1);
    };
    const entry = [];
    for (const x of [-2, 0.5, 5, 12, box.width-12, 5, -2]) entry.push(await sampleEntry(x));
    assert.equal(entry[0],0);
    assert.ok(entry[1]<=1 && entry[1]<entry[2] && entry[2]<entry[3], `smooth edge entry: ${entry}`);
    assert.ok(entry[4]<entry[3], `proximal ground receives more light: ${entry}`);
    assert.equal(entry[5],entry[2], "same position gives the same light on exit");
    assert.equal(entry[6],0);
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
        // Includes wall lighting and AA quantization. The rescaled
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
