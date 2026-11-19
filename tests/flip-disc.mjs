import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ channel: "chrome", headless: true });
// Only compare the optical surface, not the native keyboard focus ring.
const difference = (a, b) => {
  let sum = 0,
    count = 0;
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++) {
      if (
        Math.hypot((x + 0.5) / a.width - 0.5, (y + 0.5) / a.height - 0.5) > 0.46
      )
        continue;
      const i = (y * a.width + x) * 4;
      for (let c = 0; c < 3; c++)
        sum += Math.abs(a.data[i + c] - b.data[i + c]);
      count += 3;
    }
  return sum / count;
};
try {
  for (const [fallback, dpr] of [
    [false, 1],
    [false, 2],
    [true, 1.5],
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1120, height: 1120 },
      deviceScaleFactor: dpr,
    });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript((gl) => {
      if (gl) Object.defineProperty(navigator, "gpu", { value: undefined });
      window.poseTime = 5000;
      performance.now = () => window.poseTime;
    }, fallback);
    const tick = async (ms) =>
      page.evaluate(async (ms) => {
        window.poseTime += ms;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      }, ms);
    const load = async () => {
      await page.goto("about:blank");
      await page.goto(server.resolvedUrls.local[0] + "flip.html#ripple");
      await page.waitForFunction(
        () => document.querySelectorAll("[data-oyn-active]").length === 38,
      );
      await page.mouse.move(250, 210);
      await page.mouse.move(300, 260);
      await tick(0);
    };
    const stones = page.locator(".stone"),
      near = stones.first(),
      far = stones.last();
    const shot = async (stone) => PNG.sync.read(await stone.screenshot());
    await load();
    assert.equal(await page.locator("main").getByRole("slider").count(), 15);
    assert.equal(
      await page
        .getByRole("navigation", { name: "Projects" })
        .getByRole("link")
        .count(),
      6,
    );
    assert.ok(
      await page
        .locator("canvas")
        .evaluateAll((cs) =>
          cs.every(
            (c) =>
              Math.abs(
                c.width - c.getBoundingClientRect().width * devicePixelRatio,
              ) < 1.1,
          ),
        ),
    );
    const board = await page.locator(".wave-grid").boundingBox();
    assert.ok(board.width >= 500, "desktop board uses the available content width");
    const orange = await shot(near),
      farOrange = await shot(far);
    const center =
      ((orange.height >> 1) * orange.width + (orange.width >> 1)) * 4;
    assert.ok(orange.data[center] > orange.data[center + 2] + 70);
    await page.getByRole("button", { name: "Dark mode" }).focus(); // navigate from the project sidebar
    await page.keyboard.press("Tab");
    assert.ok(await near.evaluate((el) => el.matches("button:focus-visible")));
    const socket = async () => {
      const b = await near.boundingBox();
      return PNG.sync.read(
        await page.screenshot({
          clip: {
            x: b.x - b.width * 0.2,
            y: b.y - b.height * 0.2,
            width: b.width * 1.4,
            height: b.height * 1.4,
          },
        }),
      );
    };
    const lit = await socket();
    await page.keyboard.press("Tab");
    assert.ok(
      await stones.nth(1).evaluate((el) => el.matches(":focus-visible")),
    );
    const unlit = await socket();
    // An unfocused receiver sees the same lamp whether Tab or the mouse
    // put it at the second button. Moving the mouse again takes it back.
    const keyboardLight = await shot(near);
    const second = await stones.nth(1).boundingBox();
    await page.mouse.move(second.x + second.width/2, second.y + second.height/2);
    await tick(0);
    assert.ok(difference(keyboardLight, await shot(near)) < 1);
    await page.mouse.move(300, 260);
    await tick(0);
    assert.ok(difference(keyboardLight, await shot(near)) > 1);

    const annulus =
      Math.floor(lit.height / 2) * lit.width + Math.floor(lit.width * 0.11);
    assert.ok(
      lit.data[4 * annulus] - lit.data[4 * annulus + 2] >
        unlit.data[4 * annulus] - unlit.data[4 * annulus + 2] + 55,
      "Tab lights the socket and leaving extinguishes it",
    );
    await near.press("Enter");
    await page.getByRole("button", { name: "Dark mode" }).focus(); // Compare wave motion with the socket unlit.
    await tick(170);
    assert.ok(difference(orange, await shot(near)) > 4);
    assert.ok(
      difference(farOrange, await shot(far)) < 0.2,
      "await arrival before moving",
    );
    await tick(800); // t=970
    const uncontestedNear = await shot(near),
      uncontestedFar = await shot(far);
    await tick(4000);
    const white = await shot(near);
    assert.ok(Math.abs(white.data[center] - white.data[center + 2]) < 30);

    // Retrigger from the opposite end while all stones are already moving.
    // Until the second front arrives the original trajectory must be unchanged.
    await load();
    await near.press("Enter");
    await page.getByRole("button", { name: "Dark mode" }).focus(); // Compare wave motion with the socket unlit.
    await tick(800);
    await far.press("Enter");
    await page.getByRole("button", { name: "Dark mode" }).focus();
    await tick(170);
    assert.ok(
      difference(uncontestedNear, await shot(near)) < 0.2,
      "rapid tap must not synchronise the far side",
    );
    assert.ok(
      difference(uncontestedFar, await shot(far)) > 4,
      "second origin gets its own half turn",
    );
    await tick(5000);
    assert.ok(
      difference(orange, await shot(near)) < 0.2,
      "two pulses complete two half turns",
    );

    const bench = await page.locator(".bench").boundingBox();
    await page.mouse.move(bench.x + 12, bench.y + 20);
    await tick(0);
    const baselineScroll = await page.evaluate(() => scrollY);
    const beforeGap = await shot(near),
      beforeFar = await shot(far);
    await page.mouse.click(bench.x + 12, bench.y + 20);
    await tick(175);
    assert.ok(
      difference(beforeGap, await shot(near)) < 0.2,
      "empty desktop cannot launch a wave",
    );
    assert.ok(difference(beforeFar, await shot(far)) < 0.2);
    await page.mouse.click(bench.x + 12, bench.y + 20);
    await tick(2400);
    assert.ok(
      difference(beforeGap, await shot(near)) < 0.2,
      "repeated desktop taps leave the stones alone",
    );

    const sliders = page.locator("main").getByRole("slider"),
      initial = await sliders.evaluateAll((ns) => ns.map((n) => n.value));
    await page.locator("#stroke").press("End");
    await page.reload();
    assert.equal(await page.locator("#stroke").inputValue(), "200");
    for (const limit of ["max", "min"]) {
      for (const input of await sliders.all())
        await input.press(limit === "max" ? "End" : "Home");
      await tick(0);
      assert.ok(
        difference(beforeGap, await shot(near)) > 1,
        "live material/cut changes",
      );
    }
    await page.getByRole("button", { name: "恢复默认" }).press("Enter");
    assert.deepEqual(
      await sliders.evaluateAll((ns) => ns.map((n) => n.value)),
      initial,
    );
    await page.evaluate((y) => window.scrollTo(0, y), baselineScroll);
    await page.mouse.move(bench.x + 12, bench.y + 20);
    await tick(0);
    assert.ok(
      difference(beforeGap, await shot(near)) < 0.2,
      "controls do not launch a wave",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await near.press("Space");
    await page.getByRole("button", { name: "Dark mode" }).focus(); // Compare faces with the same lamp.
    await tick(0);
    assert.ok(difference(beforeGap, await shot(near)) > 8);
    assert.ok(
      difference(beforeFar, await shot(far)) < 0.2,
      "reduced motion still preserves the wavefront",
    );
    await tick(6000);
    assert.ok(difference(beforeFar, await shot(far)) > 8);
    // Same pointer/light and face throughout: only the pivot stroke changes.
    await page.getByRole("button", { name: "恢复默认" }).focus();
    await near.hover();
    await tick(0);
    const radiusPixels = (png) => {
      const y = png.height >> 1;
      let width = 0;
      for (let x = 0; x < png.width; x++) {
        const i = (y * png.width + x) * 4;
        if (png.data[i] > png.data[i + 2] + 60) width++;
      }
      return width;
    };
    // The reduced-motion pulse above left the field white. Return to orange.
    await near.click();
    await tick(1200);
    const hoveredWidth = radiusPixels(await shot(near));
    await page.mouse.down();
    await tick(0);
    assert.ok(
      radiusPixels(await shot(near)) < hoveredWidth,
      "press sinks deeper than hover",
    );
    await page.mouse.up();
    await tick(1200);
    // With the lamp above the crown, disabling specular must change the face
    // center, not just the rim. Check both pigments with the same optics.
    await load();
    // Isolate the lamp from the pigment, socket and grazing reflection.
    // With the lamp well to the right, its image must follow the rim vertically.
    const box = await near.boundingBox();
    await page.mouse.move(box.x + box.width / 2 + 360, box.y + box.height / 2);
    await tick(200);
    const oblique = await shot(near);
    await page.locator("#reflectionStrength").press("Home");
    await tick(0);
    const lampOff = await shot(near);
    let minX = oblique.width,
      maxX = -1,
      minY = oblique.height,
      maxY = -1;
    for (let y = 0; y < oblique.height; y++)
      for (let x = 0; x < oblique.width; x++) {
        const blue = (y * oblique.width + x) * 4 + 2;
        if (oblique.data[blue] - lampOff.data[blue] < 20) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    assert.ok(
      maxX >= minX &&
        minX > oblique.width * 0.8 &&
        maxY - minY > 2 * (maxX - minX + 1),
      "long tangential lamp image at the rim",
    );
    await page.getByRole("button", { name: "恢复默认" }).press("Enter");
    for (const face of ["orange", "white"]) {
      await near.hover();
      if (face === "white") await near.click();
      await tick(2000);
      const on = await shot(near);
      await page.locator("#reflectionStrength").press("Home");
      await tick(0);
      const off = await shot(near);
      assert.ok(
        on.data[center + 2] > off.data[center + 2] + 3,
        face + " has a crown reflection",
      );
      // A centered finite emitter has a boundary; disabling it must leave
      // the surrounding pigment unchanged, not remove a broad specular halo.
      const shoulder = center + 4 * Math.ceil(on.width * 0.1);
      assert.ok(
        Math.abs(on.data[shoulder + 2] - off.data[shoulder + 2]) < 2,
        face + " has no frosted halo around the lamp image",
      );
      await page.getByRole("button", { name: "恢复默认" }).press("Enter");
    }
    await page.setViewportSize({ width: 360, height: 740 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth === innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "Ripple: repeated/overlapping strikes, inert gaps, both faces, 15 live sliders and reset, keyboard, reduced motion, DPR and mobile verified on WebGPU / WebGL2.",
  );
} finally {
  await browser.close();
  await server.close();
}
