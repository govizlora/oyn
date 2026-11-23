import assert from "node:assert/strict";
import { createServer } from "vite";
import { PNG } from "pngjs";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { createControlMotion } from "../packages/ui/dist/control-motion.js";
import { bindMotion } from "../packages/surface/dist/adapters/motion.js";

// Drive the consumer's clock explicitly. Surface's adapter only forwards numbers.
let now = 0,
  id = 0;
const callbacks = new Map();
const media = new EventTarget();
media.matches = false;
const view = {
  performance: { now: () => now },
  matchMedia: () => media,
  requestAnimationFrame: (callback) => {
    callbacks.set(++id, callback);
    return id;
  },
  cancelAnimationFrame: (handle) => callbacks.delete(handle),
};
function step(dt) {
  now += dt;
  const pending = [...callbacks.values()];
  callbacks.clear();
  for (const callback of pending) callback(now);
}
// Same press deadline for Recess, Lower slightly and Lift slightly. A longer
// trip must move faster, not take longer or acquire a longer settling tail.
for (const hover of [-2.8, 2, 24]) {
  const press = createControlMotion(view, hover);
  press.setTarget(-6);
  let previous = hover;
  let previousStep = Infinity;
  for (let i = 1; i <= 6; i++) {
    step(25);
    const distance = previous - press.get();
    assert.ok(distance > 0 && distance < previousStep);
    assert.ok(
      Math.abs((press.get() + 6) / (hover + 6) - (1 - i / 6) ** 3) < 1e-10,
    );
    assert.equal(callbacks.size, i === 6 ? 0 : 1);
    previous = press.get();
    previousStep = distance;
  }
  assert.equal(press.get(), -6);
  press.dispose();
}
const motion = createControlMotion(view, 8);
const values = [];
const disconnect = bindMotion(motion, (value) => values.push(value));
assert.deepEqual(values, [8]);
motion.setTarget(-6);
assert.equal(callbacks.size, 1);
step(16);
const before = motion.get();
assert.ok(before < 8 && before > -6);
motion.setTarget(8);
assert.equal(motion.get(), before, "reversal must not reset position");
assert.equal(
  callbacks.size,
  1,
  "reversal must not introduce another animation clock",
);
step(1);
assert.ok(
  motion.get() > before,
  "reversal immediately heads toward the new target",
);
for (let i = 0; i < 80; i++) step(16);
assert.equal(motion.get(), 8);
assert.equal(callbacks.size, 0, "settled sources stop scheduling");
motion.setTarget(-3.2);
step(16);
media.matches = true;
media.dispatchEvent(new Event("change"));
assert.equal(motion.get(), -3.2);
assert.equal(callbacks.size, 0);
motion.setTarget(-6);
assert.equal(
  motion.get(),
  -6,
  "reduced motion applies the target synchronously",
);
const count = values.length;
disconnect();
motion.setTarget(8);
assert.equal(values.length, count, "adapter detachment stops writes");
media.matches = false;
motion.setTarget(-6);
motion.dispose();
assert.equal(callbacks.size, 0, "disposal cancels the consumer's animation");

const server = await createServer({
  configFile: false,
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { entries: ["tests/fixtures/ui-control.html"] },
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 780 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    window.scheduled = 0;
    const schedule = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      window.scheduled++;
      return schedule(callback);
    };
  });
  await page.goto(
    server.resolvedUrls.local[0] + "tests/fixtures/ui-control.html",
  );
  await page.locator("#key[data-oyn-active]").waitFor();
  const key = page.locator("#key");
  const canvas = key.locator("canvas");
  await canvas.evaluate((node) => {
    window.originalCanvas = node;
  });
  const bounds = await key.boundingBox();
  const at = (x, y) => page.mouse.move(bounds.x + x, bounds.y + y);
  const settle = () => page.waitForTimeout(550);
  const painted = async () => {
    await settle();
    return canvas.screenshot();
  };
  // Read a composed pixel inside the real Button, away from the label and rim.
  // Changing the receiver (not the Button) exposes any invented pigment or self-shadow.
  await page
    .locator("#fieldset")
    .evaluate((el) => (el.style.backgroundColor = "#458692"));
  async function checkInterior(rgb) {
    await settle();
    const png = PNG.sync.read(
      await page.screenshot({
        clip: {
          x: Math.floor(bounds.x + 32),
          y: Math.floor(bounds.y + bounds.height / 2),
          width: 1,
          height: 1,
        },
      }),
    );
    assert.deepEqual([...png.data], [...rgb, 255]);
  }
  for (const [css, rgb] of [
    ["", [69, 134, 146]],
    ["#b56338", [181, 99, 56]],
  ]) {
    await key.evaluate((el, color) => (el.style.backgroundColor = color), css);
    await at(-10, 0);
    await checkInterior(rgb); // raised
    await at(3, bounds.height / 2);
    await checkInterior(rgb); // flat
    await page.mouse.down();
    await checkInterior(rgb); // recessed
    await page.mouse.up();
  }
  await at(3, bounds.height / 2);
  const hover = await painted();
  await page.mouse.down();
  const pressed = await painted();
  assert.ok(
    !pressed.equals(hover),
    "padding belongs to the same responsive hit area",
  );
  assert.deepEqual(
    await key.boundingBox(),
    bounds,
    "pressing does not scale the hit target",
  );
  await at(-30, bounds.height / 2);
  await settle();
  await at(3, bounds.height / 2);
  assert.ok(
    (await painted()).equals(pressed),
    "dragging back in resumes the held gesture",
  );
  await page.mouse.up();
  assert.ok(
    (await painted()).equals(hover),
    "release restores hover, not pressed state",
  );

  // Captured pointers still respect physical bounds and a document-level release.
  await key.evaluate((node) =>
    node.addEventListener(
      "pointerdown",
      (event) => node.setPointerCapture(event.pointerId),
      { once: true },
    ),
  );
  await page.mouse.down();
  await at(-30, bounds.height / 2);
  await page.mouse.up();
  await at(3, bounds.height / 2);
  assert.ok(
    (await painted()).equals(hover),
    "outside captured release cannot stick",
  );

  for (const attribute of ["disabled", "aria-busy", "data-disabled"]) {
    await page.mouse.down();
    await settle();
    await key.evaluate(
      (node, attribute) => node.setAttribute(attribute, "true"),
      attribute,
    );
    const quiet = await painted();
    assert.ok(
      !quiet.equals(pressed),
      `${attribute} cancels an active gesture without pointer movement`,
    );
    await page.mouse.up();
    await key.evaluate(
      (node, attribute) => node.removeAttribute(attribute),
      attribute,
    );
    await at(-30, 10);
    await at(3, bounds.height / 2);
    assert.ok((await painted()).equals(hover));
  }
  await page.mouse.down();
  await page.locator("#fieldset").evaluate((node) => {
    node.disabled = true;
  });
  assert.ok(
    !(await painted()).equals(pressed),
    "disabled fieldset is inherited",
  );
  await page.mouse.up();
  await page.locator("#fieldset").evaluate((node) => {
    node.disabled = false;
  });

  await page.mouse.move(600, 600);
  await key.focus();
  await page.keyboard.down("Space");
  const keyboardPress = await painted();
  await page.keyboard.up("Space");
  assert.ok(!(await painted()).equals(keyboardPress));
  assert.ok(await canvas.evaluate((node) => node === window.originalCanvas));

  const toggle = page.locator("#toggle");
  const toggleCanvas = await toggle.locator("canvas").elementHandle();
  await toggle.focus();
  await page.keyboard.press("Space");
  assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  await page.keyboard.press("Space");
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  assert.ok(
    await toggleCanvas.evaluate((node) => node.isConnected),
    "selection updates preserve the surface",
  );
  await page.locator("#link").focus();
  await page.keyboard.press("Space");
  assert.equal(
    new URL(page.url()).hash,
    "",
    "the visual bridge does not activate links with Space",
  );
  await page.keyboard.press("Enter");
  assert.equal(new URL(page.url()).hash, "#destination");
  assert.equal(
    await page.locator("#composed").getAttribute("data-oyn-face"),
    "key",
    "outer control owns a composed Avatar host",
  );
  assert.equal(await page.locator("#composed > [data-oyn-layer]").count(), 1);

  const outline = page.locator("#outline");
  assert.equal(
    await outline.locator("canvas").count(),
    0,
    "resting outlines allocate no presentation",
  );
  await outline.hover();
  await outline.locator("canvas").waitFor();
  await page.mouse.move(600, 20);
  await settle();
  assert.equal(
    await outline.locator("canvas").count(),
    0,
    "settled outline exits release presentation resources",
  );
  assert.equal(await outline.getAttribute("data-oyn-active"), null);
  await outline.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await outline.evaluate((node) => node.parentElement.open),
    true,
    "binding and native actions survive presentation reactivation",
  );
  await outline.locator("canvas").waitFor();

  // Custom render is not evidence of an existing field frame. Both paths keep one.
  for (const id of ["custom-input", "composed-input"]) {
    const input = page.locator("#" + id);
    assert.equal(
      await input.evaluate((node) =>
        node.parentElement.matches("[data-oyn-input-frame]"),
      ),
      true,
    );
    assert.equal(
      await input.locator("xpath=ancestor::*[@data-oyn-input-frame]").count(),
      1,
    );
    assert.equal(await input.locator("canvas").count(), 0);
    await input.fill("native caret");
    assert.equal(await input.inputValue(), "native caret");
  }
  assert.equal(
    await page.locator("#input-group [data-oyn-input-frame]").count(),
    0,
  );
  assert.equal(
    await page.locator("#input-group > [data-oyn-layer]").count(),
    1,
  );

  assert.equal(
    await page.locator("#recipe-composed > [data-oyn-layer] canvas").count(),
    1,
    "native recipe render callbacks must not add a second material owner",
  );
  const switchControl = page.locator("#switch");
  const thumb = switchControl.locator('[data-slot="switch-thumb"]');
  await switchControl.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const dir of ["ltr", "rtl"]) {
    await switchControl.evaluate((node, dir) => (node.dir = dir), dir);
    await switchControl.focus();
    if ((await switchControl.getAttribute("aria-checked")) === "true")
      await page.keyboard.press("Space");
    const start = await thumb.boundingBox();
    await page.keyboard.press("Space");
    const end = await thumb.boundingBox();
    assert.ok(
      Math.abs(end.x - start.x - (dir === "ltr" ? start.width : -start.width)) <
        0.5,
    );
  }
  const durations = () =>
    page
      .locator(
        '#nested-theme [data-slot="switch-thumb"], #nested-theme [data-slot="accordion-panel"], #tooltip-motion, #toast-motion',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).transitionDuration),
      );
  assert.ok(
    (await durations()).every((value) =>
      value.split(",").every((v) => parseFloat(v) === 0),
    ),
    "nested themes must not restore motion; all DOM transitions use reduced-motion policy",
  );
  const animations = () =>
    page.locator("[data-loop-probe]").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationName),
    );
  assert.deepEqual(
    await animations(),
    ["none", "none", "none"],
    "reduced motion must stop spinner, toast and indeterminate progress loops",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.ok((await durations()).every((value) => parseFloat(value) > 0));
  assert.ok((await animations()).every((value) => value !== "none"));
  // A running CSS transition reverses from its current position, not an endpoint.
  await switchControl.evaluate((node) => (node.dir = "ltr"));
  await switchControl.click();
  await page.waitForTimeout(40);
  const reversal = await thumb.evaluate((node) => {
    const before = getComputedStyle(node).translate;
    node.parentElement.click();
    return { before, after: getComputedStyle(node).translate };
  });
  assert.equal(reversal.after, reversal.before);
  await settle();

  await page.setViewportSize({ width: 390, height: 780 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await key.hover();
  await page.mouse.down();
  await page.mouse.up();
  await settle();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/ui-control-dark-mobile.png" });
  await page.evaluate(() => window.controls.setMounted(false));
  await settle();
  assert.equal(await page.locator("canvas").count(), 0);
  const scheduled = await page.evaluate(() => window.scheduled);
  await page.mouse.move(20, 20);
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  assert.equal(
    await page.evaluate(() => window.scheduled),
    scheduled,
    "unmount leaves no animation or input subscriptions",
  );
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.controls.setDuplicate(true));
  await settle();
  assert.equal(await page.locator("#duplicate [data-oyn-layer]").count(), 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Surface target already has an active binding/);
  const fallback = await browser.newPage();
  const fallbackErrors = [];
  fallback.on("pageerror", (error) => fallbackErrors.push(error.message));
  await fallback.addInitScript(() => {
    Object.defineProperty(navigator, "gpu", { value: undefined });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : getContext.call(this, type, ...args);
    };
  });
  await fallback.goto(
    server.resolvedUrls.local[0] + "tests/fixtures/ui-control.html",
  );
  const fallbackToggle = fallback.locator("#toggle");
  await fallbackToggle.click();
  assert.equal(await fallbackToggle.getAttribute("aria-pressed"), "false");
  await fallback.locator("#custom-input").fill("Works without GPU");
  assert.equal(
    await fallback.locator("#custom-input").inputValue(),
    "Works without GPU",
  );
  assert.equal(await fallback.locator("canvas").count(), 0);
  await fallback.locator("#key").hover();
  assert.equal(
    await fallback
      .locator("#key")
      .evaluate((node) => getComputedStyle(node).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  assert.deepEqual(fallbackErrors, []);
  await fallback.close();
  console.log(
    "PASS: consumer motion adapter, reversal, reduced motion, pointer/keyboard/capture/disabled, composition, stable canvas and cleanup.",
  );
} finally {
  await browser.close();
  await server.close();
}
