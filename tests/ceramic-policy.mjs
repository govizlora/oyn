import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  decodeGeometry,
  bakedCeramic,
} from "../packages/ceramic/dist/baked.js";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createCeramicMaterial } from "../packages/ceramic/dist/index.js";
import {
  ceramicFinish,
  relativeLuminance,
} from "../packages/ceramic/dist/finish.js";
import { cardCeramic } from "../packages/ceramic/dist/card.js";

for (const value of [0, 160, 170, 176, 180, 191, 192, 193, 240, 255]) {
  for (const colorScheme of ["light", "dark"]) {
    const options = { colorScheme, color: `rgb(${value} ${value} ${value})` };
    const f = ceramicFinish(options);
    assert.equal(f.lighting, value > 192 ? "soft" : "glossy");
    const m = createCeramicMaterial(options);
    assert.equal(m.parameters.get(8), Number(value <= 192));
    assert.deepEqual(
      m.passes,
      colorScheme === "dark" ? ["surface"] : ["shadow", "surface"],
    );
    if (colorScheme === "dark") {
      assert.equal(m.parameters.get(14), 0);
      assert.equal(m.parameters.get(15), 0);
      assert.deepEqual(m.measurePadding(100, 60), { x: 0, y: 0 });
    }
    for (const lighting of ["soft", "glossy"])
      assert.equal(ceramicFinish({ ...options, lighting }).lighting, lighting);
  }
}
assert.ok(
  relativeLuminance([0, 1, 0]) >
    relativeLuminance([192 / 255, 192 / 255, 192 / 255]),
);
assert.equal(ceramicFinish({ color: "#00ff00" }).lighting, "soft");
assert.equal(ceramicFinish({ color: "#ff0000" }).lighting, "glossy");
assert.equal(ceramicFinish({ color: "#0000ff" }).lighting, "glossy");
assert.equal(
  ceramicFinish({
    colorScheme: "dark",
    shadowStrength: 1,
    contactShadowStrength: 1,
  }).values[14],
  0,
);
assert.throws(
  () => createCeramicMaterial({ color: { light: "#fff", dark: "#000" } }),
  /single string/,
);
assert.throws(() => createCeramicMaterial({ lighting: "invalid" }), /lighting/);
assert.throws(
  () => createCeramicMaterial({ colorScheme: "invalid" }),
  /colorScheme/,
);
assert.deepEqual(
  cardCeramic({
    width: 100,
    height: 60,
    radius: 12,
    elevation: 16,
    finish: { colorScheme: "dark" },
  }).passes,
  ["surface"],
);

const bytes = await readFile("tests/fixtures/pocket-geometry.bin");
const geometry = decodeGeometry(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
for (const colorScheme of ["light", "dark"]) {
  const material = bakedCeramic(geometry, {
    colorScheme,
    color: "#171717",
    lighting: "soft",
  });
  assert.equal(
    material.parameters.get(24),
    0,
    "Baked lighting override is independent of environment",
  );
  assert.deepEqual(
    material.passes,
    colorScheme === "light" ? ["shadow", "surface"] : ["surface"],
  );
  if (colorScheme === "dark")
    assert.deepEqual(material.measurePadding(100, 60), { x: 0, y: 0 });
}

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5199",
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5199")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ colorScheme: "light" });
  await page.goto(
    "http://127.0.0.1:5199/tests/fixtures/surface-appearance.html",
  );
  const result = await page.evaluate(async () => {
    const { createCeramicMaterial } =
      await import("/packages/ceramic/src/material.ts");
    const hosts = ["light", "dark"].map((colorScheme) => {
      const parent = document.createElement("section");
      parent.style.colorScheme = colorScheme;
      const el = document.createElement("button");
      parent.append(el);
      document.body.append(parent);
      return el;
    });
    let requests = 0;
    const controllers = [];
    const bind = (source, element) => {
      const controller = new AbortController();
      controllers.push(controller);
      return source.bind({
        element,
        signal: controller.signal,
        requestDraw() {},
        requestMeasure() {
          requests++;
        },
        inputs: {
          pointer: {
            subscribe() {
              return () => {};
            },
            getSnapshot() {
              return { position: null };
            },
          },
        },
      });
    };
    const shared = createCeramicMaterial({
      light: { source: "fixed" },
      maxElevation: 32,
    });
    const a = bind(shared, hosts[0]),
      b = bind(shared, hosts[1]);
    const state = (binding) => ({
      color: Array.from(binding.material.parameters.snapshot().slice(4, 7)),
      passes: [...binding.material.passes],
      elevation: binding.material.parameters.get(1),
    });
    const initial = [state(a), state(b)];
    shared.setElevation(24);
    const elevations = [state(a).elevation, state(b).elevation];
    const stable = a.material.parameters;
    hosts[0].parentElement.style.colorScheme = "only dark";
    await new Promise((r) => setTimeout(r, 30));
    const notified = requests > 0;
    a.measure();
    const manual = state(a);
    const isolated = state(b);
    const sameParameters = stable === a.material.parameters;
    const explicit = bind(
      createCeramicMaterial({ colorScheme: "light", color: "#171717" }),
      hosts[1],
    );
    const override = state(explicit);
    hosts[0].parentElement.style.colorScheme = "light dark";
    a.measure();
    const both = state(a);
    const abortRequests = requests;
    controllers.forEach((c) => c.abort());
    await new Promise((r) => setTimeout(r, 30));
    const afterAbort = requests;
    hosts[0].parentElement.style.colorScheme = "light";
    await new Promise((r) => setTimeout(r, 30));
    const cleanup = requests === afterAbort;
    hosts.forEach((el) => el.parentElement.remove());
    return {
      initial,
      elevations,
      notified,
      manual,
      isolated,
      sameParameters,
      override,
      both,
      cleanup,
      abortRequests,
    };
  });
  assert.deepEqual(
    result.initial.map((s) => s.passes),
    [["shadow", "surface"], ["surface"]],
  );
  assert.notDeepEqual(result.initial[0].color, result.initial[1].color);
  assert.deepEqual(result.elevations, [24, 24]);
  assert.ok(result.notified && result.sameParameters && result.cleanup);
  assert.deepEqual(result.manual.passes, ["surface"]);
  assert.deepEqual(result.override.passes, ["shadow", "surface"]);
  assert.deepEqual(result.both.passes, ["shadow", "surface"]);
  assert.deepEqual(result.isolated.passes, ["surface"]);
  console.log(
    "PASS Ceramic policy: threshold, chromatic luminance, overrides, shadows, inherited CSS, shared targets, setters, cleanup",
  );
} finally {
  await browser?.close();
  server.kill();
}
