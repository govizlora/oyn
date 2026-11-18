import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "examples/atelier",
    "--host",
    "127.0.0.1",
    "--port",
    "5202",
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5202")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5202/?view=color-lab");
  await page.waitForFunction(
    () => document.querySelectorAll(".color-lab-sample canvas").length === 34,
  );
  assert.equal(await page.locator("[data-lighting=soft]").count(), 17);
  assert.equal(await page.locator("[data-lighting=glossy]").count(), 17);
  for (const color of ["#a0a0a0", "#aaaaaa", "#b0b0b0", "#b4b4b4", "#c0c0c0"]) {
    assert.equal(await page.locator(`[data-color="${color}"]`).count(), 2);
  }
  await page
    .getByRole("button", { name: "Background #181818", exact: true })
    .click();
  assert.equal(
    await page
      .locator(".color-lab")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(24, 24, 24)",
  );
  await page
    .getByLabel("Custom material color", { exact: true })
    .fill("#123456");
  assert.equal(await page.locator('[data-color="#123456"]').count(), 2);
  await page.getByLabel("Elevation", { exact: true }).fill("-3");
  await page.waitForTimeout(200);
  assert.match(
    await page.locator(".color-lab-note").textContent(),
    /inset shader/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS color lab: paired renderers, background, custom color, inset and mobile layout",
  );
} finally {
  await browser?.close();
  server.kill();
}
