import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, devices } from "playwright";
import { createStudyPointer } from "../site/pointer.js";

// Deterministic source checks: one clock, live preferences, cleanup and handoff.
class Host extends EventTarget {
  innerWidth = 390;
  innerHeight = 844;
  document = Object.assign(new EventTarget(), {
    hidden: false,
    hasFocus: () => true,
  });
  media = new Map();
  frames = new Map();
  id = 0;
  matchMedia(query) {
    if (!this.media.has(query))
      this.media.set(
        query,
        Object.assign(new EventTarget(), { matches: false }),
      );
    return this.media.get(query);
  }
  requestAnimationFrame = (fn) => {
    const id = ++this.id;
    this.frames.set(id, fn);
    return id;
  };
  cancelAnimationFrame = (id) => this.frames.delete(id);
  tick(now) {
    const frames = [...this.frames.values()];
    this.frames.clear();
    frames.forEach((fn) => fn(now));
  }
  emit(type, props) {
    this.dispatchEvent(Object.assign(new Event(type), props));
  }
}
const host = new Host();
const source = createStudyPointer(host);
const read = () => source.inputs.pointer.getSnapshot().position;
assert.deepEqual(read(), { x: 195, y: 422 });
const off = source.inputs.pointer.subscribe(() => {});
const off2 = source.inputs.pointer.subscribe(() => {});
assert.equal(host.frames.size, 1);
host.tick(0);
host.tick(3000);
assert.notDeepEqual(read(), { x: 195, y: 422 });
const reduced = host.matchMedia("(prefers-reduced-motion: reduce)");
reduced.matches = true;
reduced.dispatchEvent(new Event("change"));
assert.equal(host.frames.size, 0);
reduced.matches = false;
reduced.dispatchEvent(new Event("change"));
assert.equal(host.frames.size, 1);
host.document.hidden = true;
host.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(host.frames.size, 0);
host.document.hidden = false;
host.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(host.frames.size, 1);
host.innerWidth = 430;
host.emit("resize", {});
assert.deepEqual(read(), { x: 215, y: 422 });
host.emit("touchstart", {
  changedTouches: [{ identifier: 1 }],
  touches: [{ identifier: 1, clientX: 70, clientY: 90 }],
});
assert.deepEqual(read(), { x: 70, y: 90 });
assert.equal(host.frames.size, 0);
host.emit("touchmove", {
  touches: [
    { identifier: 2, clientX: 10, clientY: 20 },
    { identifier: 1, clientX: 80, clientY: 100 },
  ],
});
assert.deepEqual(read(), { x: 80, y: 100 });
host.emit("touchcancel", { changedTouches: [{ identifier: 1 }] });
host.document.dispatchEvent(new Event("visibilitychange"));
assert.equal(host.frames.size, 0);
off();
off2();
host.emit("pointermove", {
  isPrimary: true,
  pointerType: "mouse",
  clientX: 0,
  clientY: 0,
});
assert.deepEqual(read(), { x: 80, y: 100 });
const reconnect = source.inputs.pointer.subscribe(() => {});
assert.equal(host.frames.size, 0);
host.emit("pointermove", {
  isPrimary: true,
  pointerType: "mouse",
  clientX: 30,
  clientY: 40,
});
assert.deepEqual(read(), { x: 30, y: 40 });
assert.equal(source.showCursor(), false);
reconnect();
const idleHost = new Host();
const stopIdle = createStudyPointer(idleHost).inputs.pointer.subscribe(
  () => {},
);
stopIdle();
assert.equal(idleHost.frames.size, 0);

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "site",
    "--host",
    "127.0.0.1",
    "--port",
    "5197",
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let output = "";
server.stdout.on("data", (chunk) => (output += chunk));
server.stderr.on("data", (chunk) => (output += chunk));
const url = "http://127.0.0.1:5197";
let browser;
try {
  for (let i = 0; ; i++) {
    if (server.exitCode !== null) throw Error(output);
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    if (i > 100) throw Error("Site server did not start: " + output);
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({
    ...devices["iPhone 13"],
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  const cursor = page.locator(".study-cursor");
  await cursor.waitFor({ state: "visible" });
  const position = () =>
    cursor.evaluate((node) => {
      const m = new DOMMatrix(getComputedStyle(node).transform);
      return [m.m41, m.m42];
    });
  assert.deepEqual(await position(), [195, 332]);
  assert.equal(await cursor.locator("path").getAttribute("fill"), "#111");
  assert.equal(await cursor.locator("path").getAttribute("stroke"), "#fff");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(1200);
  assert.notDeepEqual(await position(), [195, 332]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frozen = await position();
  await page.waitForTimeout(100);
  assert.deepEqual(await position(), frozen);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 120, y: 350 }],
  });
  assert.deepEqual(await position(), [120, 350]);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 140, y: 380 }],
  });
  await page.waitForTimeout(60);
  assert.deepEqual(await position(), [140, 380]);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(250);
  assert.deepEqual(await position(), [140, 380]);
  await page
    .locator("label")
    .filter({ hasText: /^Motion$/ })
    .tap();
  assert.equal(await page.locator("#motion").isVisible(), true);
  await page.getByLabel("Appearance").selectOption("dark");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/oyn-pointer-dark.png" });
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 740 });
    await page.reload();
    await cursor.waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
  }
  const desktop = await browser.newPage();
  await desktop.goto(url);
  await desktop.locator(".study-cursor").waitFor({ state: "attached" });
  assert.equal(await desktop.locator(".study-cursor").isVisible(), false);
  await desktop.mouse.move(400, 300);
  assert.equal(await desktop.locator(".study-cursor").isVisible(), false);
  // Native CSS and the app input remain usable without a GPU; no backend retry.
  const fallback = await browser.newPage({ ...devices["iPhone 13"] });
  await fallback.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await fallback.goto(url);
  await fallback.locator(".study-cursor").waitFor({ state: "visible" });
  await fallback
    .locator("label")
    .filter({ hasText: /^Light$/ })
    .tap();
  assert.equal(await fallback.locator("#light").isVisible(), true);
  assert.equal(await fallback.locator("[data-oyn-active]").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: site center, arrow, idle motion, reduced motion, visibility, touch takeover/cancel, cleanup, native controls, desktop, narrow layouts and CSS fallback.",
  );
} finally {
  await browser?.close();
  server.kill();
}
