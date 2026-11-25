import { strict as assert } from "node:assert";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 700 },
    colorScheme: "light",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.OYN_SITE_URL || "http://127.0.0.1:4186");
  const demo = page.getByRole("tablist", { name: "Ceramic details" });
  const theme = page.getByRole("tablist", { name: "Color scheme" });
  const tab = (list, name) => list.getByRole("tab", { name, exact: true });
  const panel = page.locator("[data-oyn-tab-panels]");
  await panel.locator("canvas").first().waitFor();
  await tab(demo, "Surface").waitFor();
  const metrics = await demo.evaluate((el) => ({
    gap: getComputedStyle(el).gap,
    padding: getComputedStyle(el).paddingTop,
    radius: getComputedStyle(el).borderTopLeftRadius,
  }));
  assert.deepEqual(metrics, { gap: "8px", padding: "8px", radius: "32px" });
  assert.equal(
    await panel.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    "32px",
  );
  const innerRadius = parseFloat(metrics.radius) - parseFloat(metrics.padding);
  for (const el of await demo
    .locator('[data-oyn-indicator], [role="tab"]')
    .all()) {
    assert.equal(
      await el.evaluate((node) =>
        parseFloat(getComputedStyle(node).borderTopLeftRadius),
      ),
      innerRadius,
    );
  }
  const nav = page.getByRole("navigation", { name: "Project links" });
  for (const [name, href] of [
    ["GitHub profile", "https://github.com/govizlora"],
    ["X profile", "https://x.com/Govizlora"],
    ["Twitter profile", "https://x.com/Govizlora"],
  ]) {
    const link = nav.getByRole("link", { name, exact: true });
    assert.equal(await link.getAttribute("href"), href);
    assert.equal(await link.getAttribute("data-oyn-button"), "ghost");
    const heightInEm = await link.evaluate((el) =>
      el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize),
    );
    assert.equal(heightInEm, 2.125);
    await link.hover();
    await link.locator("canvas").waitFor();
    await page.mouse.move(1, 1);
    await link.locator("canvas").waitFor({ state: "detached" });
  }
  assert.equal(
    Math.round(
      (await demo.locator("[data-oyn-indicator]").boundingBox()).height,
    ),
    64,
  );
  assert.ok(
    (await page.locator("header .signature").boundingBox()).x <
      (await page.getByRole("navigation").boundingBox()).x,
  );
  await page.getByRole("heading", { name: "Native HTML" }).waitFor();
  const panelHeight = async () => (await panel.boundingBox()).height;
  const initial = await panelHeight();
  for (const n of ["Light", "Motion", "Surface"]) {
    await tab(demo, n).click();
    await page.waitForFunction((name) => {
      const item = document.querySelector('main [aria-selected="true"]');
      const thumb = document.querySelector("main [data-oyn-indicator]");
      return (
        item?.textContent === name &&
        thumb &&
        Math.abs(
          item.getBoundingClientRect().left -
            thumb.getBoundingClientRect().left,
        ) < 1
      );
    }, n);
    assert.ok(Math.abs((await panelHeight()) - initial) <= 1);
  }
  let bg = () =>
    page.locator("html").evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(await theme.getByRole("tab").count(), 2);
  assert.equal(await theme.locator('svg[aria-hidden="true"]').count(), 2);
  assert.equal(await tab(theme, "Light").getAttribute("aria-selected"), "true");
  const light = await bg();
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await bg();
  assert.notEqual(dark, light);
  await page.reload();
  assert.equal(await tab(theme, "Dark").getAttribute("aria-selected"), "true");
  await tab(theme, "Light").click();
  assert.equal(await bg(), light);
  await tab(theme, "Light").press("ArrowRight");
  await page.waitForFunction(
    () => document.documentElement.style.colorScheme === "dark",
  );
  assert.equal(await bg(), dark);
  assert.equal(
    await tab(demo, "Surface").getAttribute("aria-selected"),
    "true",
  );

  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.reload();
  await tab(theme, "Dark").waitFor();
  assert.equal(await bg(), dark);
  assert.equal(await tab(theme, "Dark").getAttribute("aria-selected"), "true");
  await tab(theme, "Light").click();
  assert.equal(await bg(), light);
  assert.equal(await page.getByRole("navigation").getByRole("link").count(), 3);
  await page.mouse.move(24, 200);
  if (process.env.OYN_SITE_IMAGE)
    await page.screenshot({ path: process.env.OYN_SITE_IMAGE });
  for (const w of [320, 390]) {
    await page.setViewportSize({ width: w, height: 700 });
    let heights = [];
    for (const n of ["Surface", "Motion", "Light"]) {
      await tab(demo, n).click();
      heights.push(await panelHeight());
    }
    assert.ok(
      Math.max(...heights) - Math.min(...heights) <= 1,
      JSON.stringify(heights),
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Landing: real Ceramic panels, scaled track geometry, selection, keyboard, system/manual themes and mobile widths passed.",
  );
} finally {
  await browser.close();
}
