import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
const server = await createServer({ server: { port: 0, host: "127.0.0.1" } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const fallback of [false, true]) {
    const page = await browser.newPage(),
      requests = [],
      errors = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("pageerror", (e) => errors.push(String(e)));
    if (fallback)
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "gpu", { value: undefined }),
      );
    await page.goto(
      server.resolvedUrls.local[0] + "tests/fixtures/surface.html",
    );
    await page.evaluate(async () => {
      const { createEngine } = await import("/packages/surface/src/engine.ts");
      const { createCeramicMaterial } =
        await import("/packages/ceramic/src/material.ts");
      const { cardCeramic } = await import("/packages/ceramic/src/card.ts");
      const a = createCeramicMaterial({ elevation: 8 }),
        b = createCeramicMaterial({ elevation: -2 }),
        c = cardCeramic({ width: 100, height: 60, radius: 8, elevation: 8 });
      window.engine = createEngine();
      for (const [i, m] of [
        a,
        b,
        c,
        { ...a, bind: undefined, loadWebGL2: undefined },
      ].entries()) {
        const element = document.createElement("div");
        element.id = "card" + i;
        element.style.cssText = "width:100px;height:60px;border-radius:8px";
        document.body.append(element);
        window.engine.entries.set(element, { element, material: m });
      }
      window.engine.start();
    });
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-oyn-active]").length === n,
      fallback ? 3 : 4,
    );
    if (fallback) {
      assert.equal(await page.locator("#card3 canvas").count(), 0);
      assert.equal(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll("canvas")).every(
            (c) =>
              c.getContext("2d").getImageData(c.width >> 1, c.height >> 1, 1, 1)
                .data[3] > 0,
          ),
        ),
        true,
      );
      // Scrolling moves the element-owned bitmap without a JS positioning pass.
      const scroll = await page.evaluate(() => {
        document.body.style.height = "3000px";
        const host = document.querySelector("#card0"),
          canvas = host.querySelector("canvas");
        const offset = () =>
          canvas.getBoundingClientRect().top - host.getBoundingClientRect().top;
        const before = offset();
        scrollTo(0, 150);
        return { delta: offset() - before, y: scrollY };
      });
      assert.equal(scroll.delta, 0);
      assert.ok(scroll.y > 0);
      await page.evaluate(() => {
        const host = document.querySelector("#card0"),
          mesh = engine.entries.get(host);
        window.originalMaterial = mesh.material;
        mesh.material = engine.entries.get(
          document.querySelector("#card3"),
        ).material;
        engine.requestMeasure();
      });
      await page.waitForFunction(
        () => !document.querySelector("#card0 canvas"),
      );
      assert.equal(await page.locator("[data-oyn-active]").count(), 2);
      await page.evaluate(() => {
        engine.entries.get(document.querySelector("#card0")).material =
          originalMaterial;
        originalMaterial.setElevation(-3);
        engine.requestMeasure();
      });
      await page.waitForFunction(() =>
        document.querySelector("#card0[data-oyn-active] canvas"),
      );
    }
    assert.equal(
      requests.some((r) => r.includes("/generated/")),
      fallback,
    );
    assert.equal(
      requests.some((r) => r.includes("/webgl2.")),
      fallback,
    );
    await page.evaluate(() => window.engine.stop());
    assert.equal(await page.locator("canvas").count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    "PASS WebGPU isolation, generated WebGL2 pixels, CSS-only sibling, teardown",
  );
} finally {
  await browser.close();
  await server.close();
}
