import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const base = server.resolvedUrls.local[0];
  const catalog = await (await fetch(base + "r/registry.json")).json();
  const families = JSON.parse(
    await readFile("examples/atelier/src/components/catalog.json", "utf8"),
  );
  const ui = JSON.parse(await readFile("packages/ui/package.json", "utf8"));
  assert.deepEqual(
    Object.keys(ui.exports).sort(),
    [
      "./card",
      "./base-ui/tabs",
      "./control-motion",
      "./motion.css",
      ...families.map((family) => "./" + family.id),
    ].sort(),
  );
  const expected = [
    "base-ui-ceramic-tabs-list",
    "ceramic-tabs-list",
    "ceramic-ui-foundation",
    "ceramic-card",
    ...families.map((f) => "ceramic-" + f.id),
  ];
  assert.deepEqual(
    catalog.items.map((item) => item.name).sort(),
    expected.sort(),
  );
  for (const { name } of catalog.items) {
    const item = await (await fetch(base + "r/" + name + ".json")).json();
    for (const file of item.files) {
      assert.equal(file.content, await readFile(file.path, "utf8"));
    }
    assert.equal(
      (item.dependencies ?? []).some((d) => d.startsWith("@ui-sdk/")),
      name === "ceramic-tabs-list" || name === "ceramic-ui-foundation",
    );
    assert.equal(
      (item.dependencies ?? []).some((d) => d.startsWith("@base-ui/react")),
      name === "base-ui-ceramic-tabs-list",
    );
    for (const dependency of item.registryDependencies ?? []) {
      assert.ok(
        expected.includes(dependency.replace(/^@oyn\//, "")),
        dependency,
      );
    }
    assert.ok(!(item.dependencies ?? []).some((d) => /tailwind/.test(d)));
  }

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "surface.html");
  const button = page.locator("button.surface-button");
  await button.locator("canvas").waitFor();
  await button.focus();
  await page.keyboard.press("Space");
  assert.equal(await button.getAttribute("aria-pressed"), "true");
  await page.keyboard.press("Enter");
  assert.equal(await button.getAttribute("aria-pressed"), "false");
  await page.getByRole("checkbox", { name: "Button mounted" }).uncheck();
  assert.equal(await button.count(), 0);
  await page.getByRole("checkbox", { name: "Button mounted" }).check();
  await button.locator("canvas").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: registry items ship the story source and scoped dependencies; native button keyboard and remount.",
  );
} finally {
  await browser.close();
  await server.close();
}
