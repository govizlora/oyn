import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const families = JSON.parse(
  await readFile("examples/atelier/src/components/catalog.json", "utf8"),
);
const server = await preview({ preview: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Surface target|Surface canvas|WebGPU|WebGL2|GPUValidation|Maximum update depth|React does not recognize/.test(
        message.text(),
      )
    )
      errors.push(page.url() + "\n" + message.text());
  });
  const catalog = server.resolvedUrls.local[0] + "components.html";
  await page.goto(catalog);
  async function verifyMonthHeading(calendar) {
    const centers = await calendar.evaluate((host) =>
      ["calendar-previous", "calendar-heading", "calendar-next"].map((slot) => {
        const r = host
          .querySelector('[data-slot="' + slot + '"]')
          .getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }),
    );
    const [left, month, right] = centers;
    assert.ok(
      Math.abs(left[1] - month[1]) <= 0.5 &&
        Math.abs(right[1] - month[1]) <= 0.5,
    );
    assert.ok(Math.abs(month[0] - (left[0] + right[0]) / 2) <= 0.5);
  }
  await verifyMonthHeading(
    page.locator('.featured-calendar [data-slot="calendar"]'),
  );
  const rail = page.getByRole("navigation", { name: "Projects" });
  const links = rail.locator("a[data-family]");
  assert.equal(await links.count(), families.length);
  const search = rail.getByRole("searchbox");
  await search.fill("calendar");
  assert.equal(await links.count(), 1);
  await links.click();
  await search.fill("");
  const frame = page.frameLocator("iframe.specimen-stage");
  const demo = frame.locator(".specimen-content");
  const ready = (family, example) => {
    const slot =
      (family === "time-input" ? "date-input" : family) + "/" + example;
    return frame
      .locator(
        '[data-example="' +
          slot +
          '"] > :first-child:not([data-preview-loading])',
      )
      .first()
      .waitFor({ state: "attached" });
  };
  let count = 0;
  for (const family of families) {
    await rail.locator('a[data-family="' + family.id + '"]').click();
    const examples = rail.getByRole("list", {
      name: family.name + " examples",
      exact: true,
    });
    assert.equal(
      await examples.getByRole("link").count(),
      family.examples.length,
    );
    for (const example of family.examples) {
      await examples.locator('a[href$="&example=' + example.id + '"]').click();
      await ready(family.id, example.id);
      assert.deepEqual(errors, [], family.id + "/" + example.id);
      assert.equal(
        new URL(page.url()).searchParams.get("component"),
        family.id,
      );
      count++;
    }
  }
  async function visit(family, example) {
    await page.goto(catalog + "?component=" + family + "&example=" + example);
    // The section mounts before its lazy example leaves Suspense.
    await ready(family, example);
  }
  await visit("switch", "basic");
  const toggle = demo.getByRole("switch");
  await toggle.locator(":scope > [data-oyn-layer] canvas").waitFor();
  await toggle.focus();
  await page.keyboard.press("Space");
  assert.equal(await toggle.getAttribute("aria-checked"), "true");

  await visit("checkbox", "basic");
  const checkbox = demo.getByRole("checkbox");
  await checkbox.locator("canvas").first().waitFor();
  const size = () =>
    checkbox.evaluate((host) => [host.offsetWidth, host.offsetHeight]);
  assert.deepEqual(await size(), [22, 22]);
  await checkbox.click();
  assert.deepEqual(await size(), [22, 22]);

  await visit("button", "basic");
  const button = demo.locator('[data-slot="button"]');
  const canvas = await button.locator("canvas").elementHandle();
  await button.evaluate((host) => {
    host.textContent = "Saved";
  });
  await button.locator("canvas").waitFor();
  assert.ok(await canvas.evaluate((node) => node.isConnected));

  // Compare actual painted face bounds in the normal calendar and the portaled picker.
  async function verifyCalendar(panel) {
    const { inset, radius, arrows, segments } = await panel.evaluate((host) => {
      const box = (el) => el.getBoundingClientRect();
      const corner = (el) =>
        parseFloat(getComputedStyle(el).borderTopLeftRadius);
      const first = host.querySelector('[data-slot="calendar-previous"]');
      const last = host.querySelector('[data-slot="calendar-next"]');
      return {
        inset: [
          box(first).left - box(host).left,
          box(first).top - box(host).top,
          box(host).right - box(last).right,
          box(last).top - box(host).top,
        ],
        radius: corner(host),
        arrows: [corner(first), corner(last)],
        segments: [...host.querySelectorAll("tr")].flatMap((row) => {
          const faces = [...row.querySelectorAll('[data-oyn-day="range"]')];
          if (!faces.length) return [];
          const visible = faces.filter((face) => box(face).width);
          const well = box(visible[0]);
          const cells = faces.map((face) => box(face.parentElement));
          return [
            {
              wells: visible.length,
              left: well.left - Math.min(...cells.map((cell) => cell.left)),
              right: Math.max(...cells.map((cell) => cell.right)) - well.right,
              keys: [...row.querySelectorAll('[data-oyn-day="key"]')].map(
                (key) => {
                  const d = box(key);
                  return [
                    Math.min(d.left - well.left, well.right - d.right),
                    d.top - well.top,
                    well.bottom - d.bottom,
                    corner(visible[0]) - corner(key),
                  ];
                },
              ),
            },
          ];
        }),
      };
    });
    assert.ok(inset.every((v) => Math.abs(v - inset[0]) < 0.6));
    assert.ok(arrows.every((r) => Math.abs(radius - inset[0] - r) < 0.6));
    assert.ok(segments.length);
    for (const s of segments) {
      assert.equal(s.wells, 1);
      assert.ok(Math.abs(s.left) < 0.6 && Math.abs(s.right) < 0.6);
      for (const [edge, top, bottom, radiusDifference] of s.keys) {
        assert.ok(
          top > 0 &&
            Math.abs(edge - top) < 0.6 &&
            Math.abs(bottom - top) < 0.6 &&
            Math.abs(radiusDifference - top) < 0.6,
        );
      }
    }
  }
  await visit("calendar", "range");
  const calendar = demo.locator('[data-slot="calendar"]');
  await calendar.locator('[data-oyn-day="key"] canvas').first().waitFor();
  await verifyCalendar(calendar);
  const day = (date) =>
    calendar.locator('[data-value="' + date + '"]:not([data-outside])');
  for (const [start, end] of [
    ["2026-10-03", "2026-10-08"],
    ["2026-10-12", "2026-10-13"],
    ["2026-10-20", "2026-10-20"],
    ["2026-10-30", "2026-11-02"],
  ]) {
    await day(start).click();
    await day(end).click();
    // React has mounted the new key before Surface's next measurement/draw.
    await day(end).locator('[data-oyn-day="key"][data-oyn-active]').waitFor();
    await verifyCalendar(calendar);
  }
  await visit("date-picker", "range");
  await demo.getByRole("button", { name: /Choose dates/ }).click();
  const popup = frame.locator('[data-slot="date-picker-content"]');
  await popup.waitFor();
  await verifyCalendar(popup);
  await verifyMonthHeading(popup);

  await visit("accordion", "basic");
  const header = demo.getByRole("button", {
    name: "What is your return policy?",
  });
  await header.hover();
  await header.locator(":scope > [data-oyn-layer] canvas").waitFor();
  const arrowOnRight = await header.evaluate((el) => {
    const button = el.getBoundingClientRect(),
      icon = el.querySelector("svg").getBoundingClientRect();
    return (
      button.right - icon.right < 18 &&
      icon.left > button.left + button.width / 2
    );
  });
  assert.ok(arrowOnRight);
  await header.click();
  await demo
    .getByRole("region", { name: "What is your return policy?" })
    .waitFor();
  await header.press("Enter");
  await demo
    .getByRole("region", { name: "What is your return policy?" })
    .waitFor({ state: "hidden" });

  await visit("alert-dialog", "basic");
  await demo.getByRole("button", { name: "Delete Project" }).click();
  assert.equal(
    await frame.getByRole("alertdialog").getAttribute("data-oyn-face"),
    "floating",
  );
  await page.keyboard.press("Escape");
  await frame.getByRole("alertdialog").waitFor({ state: "hidden" });

  await visit("carousel", "basic");
  const slides = demo.locator('[data-slot="carousel-item"]');
  assert.equal(await slides.count(), 5);
  await demo
    .locator('[data-slot="carousel-item"][data-oyn-active]')
    .last()
    .waitFor();
  assert.deepEqual(
    await slides.evaluateAll((nodes) =>
      nodes.map(
        (node) =>
          node.querySelectorAll(":scope > [data-oyn-layer] canvas").length,
      ),
    ),
    [1, 1, 1, 1, 1],
    errors.join("\n"),
  );
  await demo.getByRole("button", { name: "Next slide" }).click();
  await demo
    .locator('[data-slot="carousel-item"][data-active]')
    .filter({ hasText: "2" })
    .waitFor();

  await visit("dialog", "basic");
  await demo.locator('[data-slot="dialog-trigger"]').click();
  await frame.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await frame.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await demo
      .locator('[data-slot="dialog-trigger"]')
      .evaluate((el) => document.activeElement === el),
    true,
  );

  await visit("input", "basic");
  assert.equal(await demo.locator('[data-oyn-face="well"]').count(), 1);
  await demo.getByRole("button", { name: "Clear website" }).click();
  assert.equal(await demo.getByRole("textbox").inputValue(), "");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await visit("calendar", "range");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.ok(
    await demo.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const menu = page.getByRole("button", { name: /Projects/ });
  await menu.click();
  const familyLinks = rail.getByRole("list", {
    name: "Calendar examples",
    exact: true,
  });
  await familyLinks
    .getByRole("link", { name: "Multiple", exact: true })
    .click();
  assert.equal(await menu.getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(".specimen h2").innerText(), "Multiple");
  await page.goBack();
  assert.equal(await page.locator(".specimen h2").innerText(), "Range");
  assert.deepEqual(errors, []);
  console.log(
    count +
      " previews mounted. Calendar, switch, dialog, input, mobile navigation and history passed.",
  );
} finally {
  await browser?.close();
  await server.close();
}
