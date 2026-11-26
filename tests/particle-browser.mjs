import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import { PNG } from "pngjs";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 760, height: 460 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(server.resolvedUrls.local[0] + "tests/fixtures/particle/");
  await page
    .waitForSelector(".cloud[data-oyn-active]", { timeout: 8000 })
    .catch((e) => {
      throw Error(errors.join("\n") || e.message);
    });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const rect = await page.locator(".cloud").boundingBox();
  const clip = {
    x: Math.floor(rect.x),
    y: Math.floor(rect.y) - 12,
    width: Math.floor(rect.width),
    height: Math.floor(rect.height) + 24,
  };
  const snap = () => page.screenshot({ clip });
  const still = await snap();
  const png = PNG.sync.read(still);
  let interior = 0,
    exterior = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4] > 27) {
        if (y < 10 || y > png.height - 10) exterior++;
        else interior++;
      }
    }

  assert.ok(
    interior > 500 && exterior > 10,
    "Grains must paint inside and beyond the host",
  );
  await page.mouse.move(320, rect.y + 25);
  await page.waitForTimeout(80);
  await page.mouse.move(380, rect.y + 25);
  await page.waitForTimeout(100);
  assert.notDeepEqual(
    await snap(),
    still,
    "A nearby pointer must disturb stationary grains",
  );
  await page.getByRole("button").click();
  await page.waitForSelector(".cloud[hidden]", { state: "attached" });
  await page.getByRole("button").click();
  await page.waitForSelector(".cloud[data-oyn-active]");
  if (process.env.CAPTURE_PARTICLE) {
    await mkdir("test-results/particle/frames", { recursive: true });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 500));
    // Screenshots omit the native cursor; mark its real position for the clip.
    await page.evaluate(() => {
      const dot = document.createElement("span");
      dot.style.cssText =
        "position:fixed;pointer-events:none;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px #ffffff33;transform:translate(-50%,-50%);z-index:5";
      document.body.append(dot);
      document.addEventListener("pointermove", (e) => {
        dot.style.left = e.clientX + "px";
        dot.style.top = e.clientY + "px";
      });
    });
    for (let i = 0; i < 109; i++) {
      if (i <= 34) {
        const u = Math.max(0, (i - 12) / 22);
        await page.mouse.move(
          140 + 480 * u,
          rect.y + 30 + 10 * Math.sin(u * 6),
        );
      }
      if (i === 65) await page.getByRole("button").dispatchEvent("click");
      await page.clock.runFor(50);
      await page.screenshot({
        path: `test-results/particle/frames/${String(i).padStart(3, "0")}.png`,
      });
    }
  }
  // Measure one isolated grain at 4x DPR. At matched consumer times only
  // translation may change, even after the cursor has left the measured area.
  const probe = await browser.newPage({
    viewport: { width: 160, height: 100 },
    deviceScaleFactor: 4,
  });
  await probe.route("**/grain-probe.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<style>*{margin:0}body{background:black}#grain{width:160px;height:100px}</style><div id="grain"></div>',
    }),
  );
  await probe.goto(server.resolvedUrls.local[0] + "grain-probe.html");
  await probe.evaluate(async () => {
    const { mountProbe } = await import("/tests/fixtures/particle/probe.ts");
    window.phase = mountProbe(document.querySelector("#grain"));
  });
  await probe.waitForSelector("#grain[data-oyn-active]");
  const measure = async (time) => {
    await probe.evaluate(async (t) => {
      window.phase(t);
      await new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      );
    }, time);
    const { width, data } = PNG.sync.read(await probe.screenshot());
    let mass = 0,
      x = 0,
      y = 0,
      sq = 0;
    for (let k = 0; k < data.length; k += 4) {
      const v = data[k],
        px = (k / 4) % width,
        py = Math.floor(k / 4 / width);
      mass += v;
      x += px * v;
      y += py * v;
      sq += (px * px + py * py) * v;
    }
    assert.ok(mass > 100, "Probe grain must be visible");
    return {
      x: x / mass,
      y: y / mass,
      spread: Math.sqrt(sq / mass - (x / mass) ** 2 - (y / mass) ** 2),
    };
  };
  const late = await measure(1.6),
    baseline = await measure(0.12);
  await measure(0); // rewind to the beginning of the sweep
  await probe.mouse.move(30, 50);
  await measure(0);
  await probe.mouse.move(84, 50);
  await measure(0);
  await probe.mouse.move(151, 50);
  const moving = await measure(0.12);
  assert.ok(
    Math.hypot(moving.x - baseline.x, moving.y - baseline.y) > 6,
    "A sweep must leave a wake behind it",
  );
  assert.ok(
    Math.abs(moving.spread / baseline.spread - 1) < 0.05,
    "Pointer displacement must preserve the grain radius",
  );
  assert.deepEqual(
    await measure(1.6),
    late,
    "Wake must settle with no new pointer events",
  );
  await probe.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Particle WebGPU, diffuse boundary, rigid grain radius, inertial wake, recovery, reduced-motion exit and replay.",
  );
} finally {
  await browser.close();
  await server.close();
}
