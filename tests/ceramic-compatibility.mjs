import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

// Established raised surfaces should retain their finish. The legacy reference
// is deliberately surface-only: shrinking contact/cast shadows are tested apart.
const reference = await readFile(
  new URL("./fixtures/ceramic-before-separation.wgsl", import.meta.url),
  "utf8",
);
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 700 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(server.resolvedUrls.local[0] + "tests/fixtures/surface.html");
  const results = await page.evaluate(async (reference) => {
    const { createCeramicMaterial } =
      await import("/packages/ceramic/src/index.ts");
    const { cardCeramic } = await import("/packages/ceramic/src/card.ts");
    const { ceramicBinding } =
      await import("/packages/ceramic/src/interaction.ts");
    const { createEngine } = await import("/packages/surface/src/engine.ts");
    const host = document.createElement("div");
    host.style.cssText =
      "position:absolute;left:250px;top:220px;width:280px;height:160px";
    document.body.append(host);
    const results = [];
    for (const colorScheme of ["light", "dark"])
      for (const [radius, elevation, pointer] of [
        [0, 8, [100, 100]],
        [24, 16, [180, 120]],
        [64, 40, [800, 600]],
        [24, 16, [390, 300]],
      ]) {
        host.style.borderRadius = `${radius}px`;
        const light = {
          source: "fixed",
          position: { x: pointer[0], y: pointer[1] },
        };
        const options = {
          colorScheme,
          elevation,
          maxElevation: 40,
          darkFrost: 0, // Compare the face, not the intentionally relocated ground light.
          shadowStrength: 0,
          contactShadowStrength: 0,
          light,
        };
        const material = createCeramicMaterial(options);
        // Do not retain environmentBinding: it would substitute its own material
        // and turn this comparison into current shader versus itself.
        const mesh = {
          element: host,
          material: {
            ...material,
            bind: ceramicBinding(light),
            shader: reference,
            passes: ["surface"],
          },
        };
        const engine = createEngine();
        engine.entries.set(host, mesh);
        engine.start();
        const settle = async () => {
          for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
          if (engine.failed) throw Error("Compatibility renderer failed");
          if (!host.querySelector("canvas"))
            throw Error("Missing compatibility canvas");
          return host.querySelector("canvas").toDataURL();
        };
        try {
          const before = await settle();
          mesh.material = material;
          engine.requestMeasure();
          const after = await settle();
          mesh.material = cardCeramic({
            width: 280,
            height: 160,
            radius,
            elevation,
            maxElevation: 40,
            finish: options,
          });
          engine.requestMeasure();
          const card = await settle();
          results.push({ colorScheme, radius, elevation, before, after, card });
        } finally {
          engine.stop();
        }
      }
    host.remove();
    return results;
  }, reference);
  const report = [];
  for (const r of results)
    for (const path of ["after", "card"]) {
      const a = PNG.sync.read(Buffer.from(r.before.split(",")[1], "base64"));
      const b = PNG.sync.read(Buffer.from(r[path].split(",")[1], "base64"));
      assert.equal(a.width, b.width);
      assert.equal(a.height, b.height);
      let max = 0,
        total = 0,
        correctedEdgeMax = 0,
        correctedChannels = 0;
      for (let i = 0; i < a.data.length; i++) {
        const alpha = i - (i % 4) + 3;
        const x = i % 4 === 3 ? a.data[i] : (a.data[i] * a.data[alpha]) / 255;
        const y = i % 4 === 3 ? b.data[i] : (b.data[i] * b.data[alpha]) / 255;
        const d = Math.abs(x - y);
        const pixel = Math.floor(i / 4);
        const px = (pixel % a.width) + 0.5 - a.width / 2;
        const py = Math.floor(pixel / a.width) + 0.5 - a.height / 2;
        const qx = Math.abs(px) - 140 + r.radius;
        const qy = Math.abs(py) - 80 + r.radius;
        const distance =
          Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
          Math.min(Math.max(qx, qy), 0) -
          r.radius;
        const correctedEdge =
          r.colorScheme === "dark" &&
          (Math.abs(distance) < 2 || Math.abs(distance + 6) < 2);
        if (correctedEdge && d > 2) {
          // Intentional AA correction: saturate radiance BEFORE coverage, not
          // after it. The frozen reference over-brightened partially covered rims.
          assert.ok(
            y <= x + 2,
            "AA correction may only reduce the legacy overshoot",
          );
          correctedEdgeMax = Math.max(correctedEdgeMax, d);
          correctedChannels++;
        } else max = Math.max(max, d);
        total += d;
      }
      const result = {
        path,
        colorScheme: r.colorScheme,
        radius: r.radius,
        elevation: r.elevation,
        max,
        correctedEdgeMax,
        correctedChannels,
        mean: total / a.data.length,
      };
      report.push(result);
      assert.ok(
        max <= 2,
        `Raised finish changed beyond premultiplied readback tolerance (2/255): ${JSON.stringify(result)}`,
      );
      assert.ok(
        correctedChannels / a.data.length < 0.01,
        "AA correction must stay localized, not change the finish",
      );
    }
  await mkdir("test-results/ceramic-compatibility", { recursive: true });
  await writeFile(
    "test-results/ceramic-compatibility/report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 16 raised finish comparisons, interiors within 2/255; localized glossy AA overshoot only decreases.",
  );
} finally {
  await browser.close();
  await server.close();
}
