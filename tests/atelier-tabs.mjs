import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 820 },
    colorScheme: "light",
  });
  async function checkTrackGap(track, vertical = false) {
    const [padding, inside, between] = await track.evaluate(
      (node, vertical) => {
        const start = vertical ? "top" : "left";
        const end = vertical ? "bottom" : "right";
        const [a, b] = Array.from(
          node.querySelectorAll(':scope > :is([role="tab"], [role="radio"])'),
          (el) => el.getBoundingClientRect(),
        );
        return [
          parseFloat(
            getComputedStyle(node)[vertical ? "paddingTop" : "paddingLeft"],
          ),
          a[start] - node.getBoundingClientRect()[start],
          b[start] - a[end],
        ];
      },
      vertical,
    );
    assert.ok(
      padding > 0 &&
        Math.abs(inside - padding) < 1 &&
        Math.abs(between - padding) < 1,
      "The gap between items equals the track inset",
    );
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0] + "?view=tabs");
  for (const implementation of ["UI SDK", "Base UI"]) {
    await page
      .getByRole("radio", { name: implementation, exact: true })
      .check();
    await page.setViewportSize({ width: 1280, height: 820 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.waitForTimeout(350);
    const list = page.getByRole("tablist"),
      thumb = list.locator('[data-slot="tabs-indicator"]');
    await thumb.locator("canvas").waitFor();
    await checkTrackGap(list);
    await list.locator(":scope > [data-oyn-layer] canvas").waitFor();
    const candidate = list.getByRole("tab", { name: "Material" });
    await candidate.hover();
    await candidate.locator(":scope > [data-oyn-layer] canvas").waitFor();
    assert.equal(await candidate.getAttribute("aria-selected"), "false");
    assert.equal(
      await candidate.evaluate((n) => getComputedStyle(n).outlineStyle),
      "none",
    );
    assert.equal(
      await candidate.evaluate((n) => getComputedStyle(n).borderTopWidth),
      "0px",
    );
    const backdrop = page.locator(
      "[data-oyn-tab-panels] > [data-oyn-layer] canvas",
    );
    await backdrop.waitFor();
    const originalCanvas = await backdrop.elementHandle();
    await page.mouse.move(0, 0);
    await candidate.locator("canvas").waitFor({ state: "detached" });
    const mountedThumb = await thumb.locator("canvas").elementHandle();
    const radius = page.getByRole("slider", { name: /Border radius/ });
    for (const value of ["0", "32"]) {
      await radius.fill(value);
      assert.equal(
        await list.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
        value + "px",
      );
    }
    const rect = async () => thumb.boundingBox();
    const start = await rect();
    const frames = await page
      .getByRole("tab", { name: "Motion" })
      .evaluate(async (tab) => {
        const indicator = tab.parentElement.querySelector(
          "[data-oyn-indicator]",
        );
        const frames = [];
        tab.click();
        const start = performance.now();
        do {
          await new Promise(requestAnimationFrame);
          const host = document.querySelector("[data-oyn-tab-panels]");
          const opacity = (selector) => {
            const el = host.querySelector(selector);
            return el ? Number(getComputedStyle(el).opacity) : null;
          };
          const starts = [
            indicator,
            ...host.querySelectorAll('[role="tabpanel"]'),
          ].flatMap((el) =>
            el
              .getAnimations()
              .filter((a) =>
                ["transform", "opacity"].includes(a.transitionProperty),
              )
              .map((a) => a.startTime),
          );
          frames.push({
            starts,
            x: indicator.getBoundingClientRect().x,
            backdrop: Number(getComputedStyle(host).opacity),
            opacity: opacity("[role=tabpanel]:not([inert],[hidden])"),
            outgoing: opacity("[role=tabpanel][data-ending-style]"),
          });
        } while (performance.now() - start < 350);
        return frames;
      });
    const end = await rect();
    assert.ok(
      frames.some(
        ({ starts }) =>
          starts.length === 3 &&
          starts[0] != null &&
          starts.every((t) => t === starts[0]),
      ),
      implementation + ": translation and both fades start on the same frame",
    );
    assert.ok(
      frames.every((f) => f.backdrop === 1),
      "The persistent surface never fades",
    );
    assert.ok(
      frames.some(
        (f) =>
          start.x < f.x && f.x < end.x && f.opacity > 0.35 && f.opacity < 1,
      ),
      implementation + ": the panel fade overlaps the indicator slide",
    );
    assert.equal(frames.at(-1).opacity, 1);
    assert.ok(
      frames.some((f) => f.outgoing > 0 && f.outgoing < 1),
      "Outgoing text fades too",
    );
    assert.ok(
      await backdrop.evaluate(
        (canvas, original) => canvas === original,
        originalCanvas,
      ),
      "Switches do not recreate the backdrop",
    );
    assert.equal(
      await thumb.evaluate((el) => getComputedStyle(el).transitionProperty),
      "transform",
    );
    const timing = (el) => [
      getComputedStyle(el).transitionDuration,
      getComputedStyle(el).transitionTimingFunction,
    ];
    const [slide, ease] = await thumb.evaluate(timing);
    assert.equal(slide, "0.25s");
    assert.equal(ease, "cubic-bezier(0.333333, 0.666667, 0.666667, 1)");
    assert.deepEqual(await page.getByRole("tabpanel").evaluate(timing), [
      slide,
      ease,
    ]);
    assert.equal(
      await page.getByRole("tabpanel").getAttribute("aria-labelledby"),
      await page.getByRole("tab", { name: "Motion" }).getAttribute("id"),
    );
    const active = list.getByRole("tab", { selected: true });
    const ink = () => active.evaluate((el) => getComputedStyle(el).color);
    const lightInk = await ink();
    await page
      .getByRole("button", {
        name: "Dark mode",
      })
      .click();
    assert.notEqual(await ink(), lightInk);
    assert.ok(
      await mountedThumb.evaluate((el) => el.isConnected),
      "theme changes preserve the indicator canvas",
    );
    await active.focus();
    await page.keyboard.press("Home");
    if (implementation === "Base UI") await page.keyboard.press("Enter");
    await list.getByRole("tab", { name: "Overview", selected: true }).waitFor();
    assert.equal(await active.textContent(), "Overview");
    const vertical = page.getByLabel("Vertical layout");
    await vertical.check();
    await checkTrackGap(list, true);
    await active.focus();
    await page.keyboard.press("ArrowDown");
    if (implementation === "Base UI") {
      assert.equal(await active.textContent(), "Overview");
      await page.keyboard.press("Space");
    }
    await list.getByRole("tab", { name: "Material", selected: true }).waitFor();
    assert.match(
      await page.getByRole("tabpanel", { name: "Material" }).innerText(),
      /track is recessed/,
    );
    await vertical.uncheck();
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .getByRole("tabpanel", { name: "Material" })
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    assert.equal(
      await thumb.evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );
    await page.setViewportSize({ width: 360, height: 760 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    // ResizeObserver delivers indicator geometry after the viewport has changed.
    await page.waitForFunction(
      () => {
        const list = document.querySelector("[data-oyn-track]");
        const indicator = list
          .querySelector('[data-slot="tabs-indicator"]')
          .getBoundingClientRect();
        const selected = list
          .querySelector('[role="tab"][aria-selected="true"]')
          .getBoundingClientRect();
        return ["x", "y", "width", "height"].every(
          (key) => Math.abs(indicator[key] - selected[key]) < 1 / 64,
        );
      },
      null,
      { timeout: 2000 },
    );
  }
  await page.getByRole("radio", { name: "UI SDK", exact: true }).check();
  await page.getByRole("tab", { name: "Material", selected: true }).waitFor();
  for (const example of ["basic", "base-ui"]) {
    await page.goto(
      server.resolvedUrls.local[0] +
        "component-preview.html?component=segmented-control&example=" +
        example,
    );
    const group = page.getByRole("radiogroup");
    const list = group.getByRole("radio", { name: "List" });
    const grid = group.getByRole("radio", { name: "Grid" });
    const indicator = group.locator(":scope > [data-oyn-indicator]");
    await indicator.locator("canvas").waitFor();
    await checkTrackGap(group);
    assert.equal(await page.getByRole("tabpanel").count(), 0);
    assert.equal(await list.getAttribute("aria-checked"), "true");
    await grid.hover();
    await grid.locator("canvas").waitFor();
    assert.equal(await grid.getAttribute("aria-checked"), "false");
    await grid.click();
    await grid.locator("canvas").waitFor({ state: "detached" });
    assert.equal(await grid.getAttribute("aria-checked"), "true");
    // Leave the light pointer stationary: changing only the hover fact must
    // not change the elevation (or pixels) of the selected indicator.
    const held = await indicator.screenshot();
    await grid.evaluate((node) =>
      node.dispatchEvent(
        new PointerEvent("pointerout", {
          bubbles: true,
          pointerType: "mouse",
          relatedTarget: node.parentElement,
        }),
      ),
    );
    await page.waitForTimeout(180);
    assert.deepEqual(
      await indicator.screenshot(),
      held,
      "selection stays raised under the pointer",
    );
    await page.keyboard.press("ArrowRight");
    const board = group.getByRole("radio", { name: "Board", checked: true });
    await board.waitFor();
    const matchesChecked = () =>
      group.evaluate((g) => {
        const a = g
          .querySelector("[data-oyn-indicator]")
          .getBoundingClientRect();
        const b = g
          .querySelector("[role=radio][aria-checked=true]")
          .getBoundingClientRect();
        return ["x", "y", "width", "height"].every(
          (k) => Math.abs(a[k] - b[k]) < 1,
        );
      });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    assert.ok(
      await matchesChecked(),
      example + ": indicator follows SDK keyboard selection",
    );
    await board.evaluate((el) => (el.style.paddingInline = "2rem"));
    await page.waitForTimeout(100);
    assert.ok(
      await matchesChecked(),
      example + ": indicator tracks item resize",
    );
    assert.equal(
      await group.locator('input[type="radio"]:checked').inputValue(),
      "board",
    );
  }
  // Exercise the real catalog boundary with OS light, not just a standalone
  // preview emulating dark. The page, embedded canvas and GPU pigment must agree.
  await page.setViewportSize({ width: 1000, height: 760 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(
    server.resolvedUrls.local[0] +
      "components.html?component=tabs&example=basic",
  );
  const frame = page.frameLocator("iframe.specimen-stage");
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  const tab = frame.getByRole("tab", { name: "Password" });
  await tab.click();
  for (const theme of ["dark", "light"]) {
    if (
      (await toggle.getAttribute("aria-pressed")) !== String(theme === "dark")
    )
      await toggle.click();
    await frame.locator('html[style*="color-scheme: ' + theme + '"]').waitFor();
    await frame.getByRole("tab", { name: "Account" }).hover();
    await frame
      .getByRole("tab", { name: "Account" })
      .locator("canvas")
      .waitFor();
    const indicator = frame.locator("[data-oyn-indicator]");
    const panel = frame.locator("[data-oyn-tab-panels]");
    await indicator.locator("canvas").waitFor();
    await panel.locator("canvas").waitFor();
    // Sample the actual composited image, including clear space inside the
    // frame. CSS backgroundColor alone does not reveal a white iframe canvas.
    const [stage, thumb, content] = await Promise.all([
      page.locator("iframe.specimen-stage").boundingBox(),
      indicator.boundingBox(),
      panel.boundingBox(),
    ]);
    const screenshot = PNG.sync.read(await page.screenshot());
    for (const [x, y] of [
      [stage.x + 25, stage.y + 32],
      [thumb.x + thumb.width / 2, thumb.y + thumb.height * 0.8],
      [content.x + content.width / 2, content.y + content.height * 0.85],
    ]) {
      const at = 4 * (Math.floor(y) * screenshot.width + Math.floor(x));
      const rgb = screenshot.data.subarray(at, at + 3);
      assert.ok(
        rgb.every((channel) =>
          theme === "dark" ? channel < 64 : channel > 180,
        ),
        theme + " preview pixel: " + Array.from(rgb),
      );
    }
  }
  // Hold the light stationary and sample actual relief, not the CSS slide.
  const samples = await browser.newPage({ colorScheme: "light" });
  samples.on("pageerror", (e) => errors.push(e.message));
  const epoch = Date.UTC(2026, 0, 1);
  await samples.clock.install({ time: epoch });
  await samples.goto(server.resolvedUrls.local[0] + "?view=tabs");
  await samples.locator("[data-oyn-indicator][data-oyn-active]").waitFor();
  // The hover pixel baseline must not include the tail of an indicator transition.
  await samples
    .locator("[data-oyn-indicator]")
    .evaluate((el) =>
      Promise.all(el.getAnimations().map((animation) => animation.finished)),
    );
  await samples.clock.pauseAt(epoch + 60_000);
  const key = samples.getByRole("tab", { name: "Material" });
  const clip = await key.boundingBox();
  const pixels = async () =>
    PNG.sync.read(await samples.screenshot({ clip })).data;
  const flat = await pixels();
  const distance = async () =>
    (await pixels()).reduce((sum, v, i) => sum + Math.abs(v - flat[i]), 0);
  await key.dispatchEvent("pointerenter", { pointerType: "mouse" });
  await samples.clock.runFor(48);
  const entering = await distance();
  await samples.clock.runFor(175);
  const recessed = await distance();
  await key.dispatchEvent("pointerleave", { pointerType: "mouse" });
  await samples.clock.runFor(48);
  const leaving = await distance();
  assert.ok(entering > 0 && entering < recessed, "Hover eases into the well");
  assert.ok(leaving > 0 && leaving < recessed, "Hover eases back to the track");
  await samples.clock.runFor(175);
  assert.equal(await distance(), 0);
  assert.equal(await key.locator("canvas").count(), 0);
  await samples.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Atelier Tabs, standard surfaces, radius, slide, keyboard, theme, reduced motion and mobile.",
  );
} finally {
  await browser.close();
  await server.close();
}
