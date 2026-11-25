import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium, devices } from "playwright";

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
const url = "http://127.0.0.1:5197";
let browser;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    if (i > 100) throw Error("Site server did not start");
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ...devices["iPhone 13"] });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url);
  const cursor = page.locator(".study-cursor");
  await cursor.waitFor({ state: "visible" });
  assert.equal(await cursor.locator("svg path").getAttribute("fill"), "#111");
  assert.equal(await cursor.locator("svg path").getAttribute("stroke"), "#fff");
  const position = () =>
    cursor.evaluate((node) => {
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      return [matrix.m41, matrix.m42];
    });
  assert.deepEqual(await position(), [195, 332]);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(1300);
  assert.notDeepEqual(await position(), [195, 332]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frozen = await position();
  await page.waitForTimeout(150);
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
  await page.waitForTimeout(300);
  assert.deepEqual(await position(), [140, 380]);
  await page.getByRole("tab", { name: "Motion", exact: true }).tap();
  assert.equal(
    await page
      .getByRole("tab", { name: "Motion", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.getByRole("tab", { name: "Dark", exact: true }).tap();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/oyn-mobile-after.png" });
  // Source lifecycle, center on resize, and reduced motion without GPU dependence.
  const result = await page.evaluate(async () => {
    const { createStudyPointer } = await import("/pointer.ts");
    const source = createStudyPointer(window);
    const pointer = source.inputs.pointer;
    const initial = pointer.getSnapshot().position;
    let notifications = 0;
    const off = pointer.subscribe(() => notifications++);
    window.dispatchEvent(new Event("resize"));
    const centered = pointer.getSnapshot().position;
    off();
    window.dispatchEvent(new Event("resize"));
    return { initial, centered, notifications };
  });
  assert.deepEqual(result, {
    initial: { x: 195, y: 332 },
    centered: { x: 195, y: 332 },
    notifications: 1,
  });
  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await desktop.goto(url);
  await desktop.locator(".study-cursor").waitFor({ state: "attached" });
  assert.equal(await desktop.locator(".study-cursor").isVisible(), false);
  await desktop.mouse.move(400, 300);
  assert.equal(await desktop.locator(".study-cursor").isVisible(), false);
  for (const width of [320, 360, 430]) {
    await page.setViewportSize({ width, height: 740 });
    await page.reload();
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Site pointer: center, drift, reduced motion, touch takeover/hold, tabs, theme, cleanup, desktop and narrow layouts passed.",
  );
} finally {
  await browser?.close();
  server.kill();
}
