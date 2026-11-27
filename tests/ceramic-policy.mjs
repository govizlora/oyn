import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createCeramicMaterial } from "../packages/materials/dist/ceramic/index.js";
import { ceramicFinish } from "../packages/materials/dist/ceramic/finish.js";

for (const colorScheme of ["light", "dark"]) {
  const material = createCeramicMaterial({ colorScheme });
  for (const color of [undefined, "#fff", "#000", "transparent", "#f00", undefined]) {
    material.update({ colorScheme, color });
    const pigment = material.parameters.snapshot().slice(4, 8);
    const expected = { "#fff": [1, 1, 1, 1], "#000": [0, 0, 0, 1], "#f00": [1, 0, 0, 1] };
    assert.deepEqual(Array.from(pigment), expected[color] ?? [0, 0, 0, 0]);
    assert.equal(material.parameters.get(8), Number(colorScheme === "dark"));
    for (const lighting of ["soft", "glossy"])
      assert.equal(ceramicFinish({ colorScheme, color, lighting }).lighting, lighting);
  }
}
assert.throws(() => ceramicFinish({ color: "inverse" }), /Unsupported/);
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
const fixtureUrl =
  "http://127.0.0.1:5199/tests/fixtures/material-lifecycle.html";
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
      if ((await fetch(fixtureUrl)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ colorScheme: "light" });
  await page.goto(fixtureUrl);
  const result = await page.evaluate(async () => {
    const { createCeramicMaterial } =
      await import("/packages/materials/src/ceramic/material.ts");
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
      color: Array.from(binding.material.parameters.snapshot().slice(4, 8)),
      glossy: binding.material.parameters.get(8),
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
    [["surface"], ["surface"]],
  );
  for (const state of [...result.initial, result.manual, result.isolated, result.both])
    assert.deepEqual(state.color, [0, 0, 0, 0]);
  assert.deepEqual(result.initial.map((s) => s.glossy), [0, 1]);
  assert.equal(result.manual.glossy, 1);
  assert.equal(result.both.glossy, 0);
  assert.deepEqual(result.elevations, [24, 24]);
  assert.ok(result.notified && result.sameParameters && result.cleanup);
  assert.deepEqual(result.manual.passes, ["surface"]);
  assert.deepEqual(result.override.passes, ["surface"]);
  assert.deepEqual(result.both.passes, ["surface"]);
  assert.deepEqual(result.isolated.passes, ["surface"]);
  console.log(
    "PASS Ceramic policy: transparent defaults, overrides, shadows, inherited CSS, shared targets, setters, cleanup",
  );
} finally {
  await browser?.close();
  server.kill();
}
