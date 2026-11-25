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
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.OYN_SITE_URL || "http://127.0.0.1:4186");
  await page.locator("button[data-oyn-active]").first().waitFor();
  assert.equal(await page.getByRole("button").count(), 3);
  await page.evaluate(() => {
    window.noteStarts = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      window.noteStarts++;
      return start.apply(this, args);
    };
  });
  const key = page.getByRole("button", { name: "Play E" });
  await key.hover();
  await key.click();
  await key.press("Space");
  await page.waitForFunction(() => window.noteStarts === 4);
  await key.blur();
  await page.mouse.move(590, 280);
  assert.equal(
    await page
      .getByRole("link", { name: "X", exact: true })
      .getAttribute("href"),
    "https://x.com/Govizlora",
  );
  if (process.env.OYN_SITE_IMAGE)
    await page.screenshot({ path: process.env.OYN_SITE_IMAGE });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Play G" }).click();
  await page.waitForFunction(() => window.noteStarts === 6);
  assert.deepEqual(errors, []);
  console.log(
    "Landing page: material, mouse, keyboard, audio and narrow layout passed.",
  );
} finally {
  await browser.close();
}
