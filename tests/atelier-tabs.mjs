import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";

const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 820 },
    colorScheme: "light",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0] + "?view=tabs");
  const list = page.getByRole("tablist"),
    thumb = list.locator('[data-slot="tabs-indicator"]');
  await thumb.locator("canvas").waitFor();
  await list.locator(":scope > [data-oyn-layer] canvas").waitFor();
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
  await page.getByRole("tab", { name: "Motion" }).click();
  await page.waitForTimeout(65);
  const during = await rect();
  await page.waitForTimeout(300);
  const end = await rect();
  assert.ok(start.x < during.x && during.x < end.x);
  assert.equal(
    await page.getByRole("tabpanel").getAttribute("aria-labelledby"),
    await page.getByRole("tab", { name: "Motion" }).getAttribute("id"),
  );
  const shot = () => thumb.screenshot();
  const matching = await shot();
  await page.getByRole("radio", { name: "Inverse" }).check();
  await page.waitForTimeout(150);
  assert.ok(
    !matching.equals(await shot()),
    "inverse changes the rendered surface",
  );
  const active = list.getByRole("tab", { selected: true });
  const ink = () => active.evaluate((el) => getComputedStyle(el).color);
  const lightInk = await ink();
  await page.getByRole("button", { name: "Dark mode" }).click();
  assert.notEqual(await ink(), lightInk);
  await active.focus();
  await page.keyboard.press("Home");
  await list.getByRole("tab", { name: "Overview", selected: true }).waitFor();
  assert.equal(await active.textContent(), "Overview");
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Atelier Tabs, standard surfaces, radius and inverse, slide, keyboard, theme, reduced motion and mobile.",
  );
} finally {
  await browser.close();
  await server.close();
}
