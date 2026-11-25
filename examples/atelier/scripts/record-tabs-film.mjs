// With Atelier running: node examples/atelier/scripts/record-tabs-film.mjs [600|1200]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const size = Number(process.argv[2] ?? 1200);
assert.ok([600, 1200].includes(size));
const viewport = 600;
const fps = 60;
const output = new URL("../../../launch/ceramic-tabs/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--force-color-profile=srgb"],
});
let encoder;
try {
  const page = await browser.newPage({
    viewport: { width: viewport, height: viewport },
    deviceScaleFactor: size / viewport,
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5177/tabs-film.html");
  await page.locator("[data-oyn-indicator][data-oyn-active]").waitFor();
  await page
    .locator("[data-oyn-tab-panels][data-oyn-active]")
    .first()
    .waitFor();
  const cdp = await page.context().newCDPSession(page);
  // Set metrics on the same CDP session that captures the surface. Per-shot clips
  // can temporarily reflow the stage at Chrome's default window dimensions.
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport,
    height: viewport,
    deviceScaleFactor: size / viewport,
    mobile: false,
  });
  // Advance the page clock for each encoded frame, not each screenshot's wall time.
  // CSS transitions use the browser timeline, separately from JS timers and rAF.
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:02Z"));
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Headless screenshots omit the system cursor. Draw only its silhouette;
    // the real browser pointer drives all hit tests, lighting and clicks.
    const cursor = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    cursor.setAttribute("viewBox", "0 0 20 26");
    cursor.setAttribute("aria-hidden", "true");
    cursor.style.cssText =
      "position:fixed;top:0;left:0;width:16px;height:auto;pointer-events:none;z-index:999;visibility:hidden";
    cursor.innerHTML =
      '<path d="M1 1 L1.5 21.5 L6.8 16.5 L10.5 24.3 L14 22.7 L10.4 15 L18 14.6 Z" fill="#151515" stroke="white" stroke-width="1.45" stroke-linejoin="round"/>';
    document.body.append(cursor);
    const starts = new WeakMap();
    window.sampleFilmTransitions = (time) => {
      for (const animation of document.getAnimations()) {
        if (
          !(animation instanceof CSSTransition) ||
          animation.playState === "finished"
        )
          continue;
        if (!starts.has(animation)) starts.set(animation, time);
        const elapsed = time - starts.get(animation);
        if (elapsed >= animation.effect.getComputedTiming().endTime)
          animation.finish();
        else animation.currentTime = elapsed;
      }
    };
    window.addEventListener(
      "pointermove",
      ({ clientX, clientY }) => {
        cursor.style.visibility = "visible";
        cursor.style.transform = `translate(${clientX}px, ${clientY}px)`;
      },
      { passive: true },
    );
  });
  const filename = fileURLToPath(new URL(`oyn-tabs-${size}-60fps.mp4`, output));
  encoder = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(fps),
      "-c:v",
      "png",
      "-i",
      "-",
      "-an",
      "-c:v",
      "libx264",
      "-crf",
      "16",
      "-preset",
      "fast",
      "-vf",
      "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-bsf:v",
      "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0",
      "-movflags",
      "+faststart+write_colr",
      filename,
    ],
    { stdio: ["pipe", "ignore", "inherit"] },
  );
  const finished = once(encoder, "close");
  let count = 0;
  async function frame(action) {
    const t = Math.round((count * 1000) / fps);
    const previous = Math.round(((count - 1) * 1000) / fps);
    await action?.();
    await page.clock.runFor(t - previous);
    await page.evaluate((t) => window.sampleFilmTransitions(t), t);
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      optimizeForSpeed: true,
    });
    const png = Buffer.from(data, "base64");
    if (!count) {
      assert.equal(png.readUInt32BE(16), size);
      assert.equal(png.readUInt32BE(20), size);
    }
    if (!encoder.stdin.write(png)) await once(encoder.stdin, "drain");
    count++;
  }
  async function shot(seconds, step) {
    const frames = Math.round(seconds * fps);
    for (let i = 1; i <= frames; i++)
      await frame(step && (() => step(i / frames)));
  }
  let x, y;
  async function move(px, py) {
    x = px;
    y = py;
    await page.mouse.move(px, py);
  }
  // A curved wrist stroke: accelerate, coast, then ease into the landing.
  function glide(px, py, seconds, bow = 0) {
    const sx = x,
      sy = y,
      dx = px - sx,
      dy = py - sy;
    const d = Math.hypot(dx, dy) || 1;
    return shot(seconds, (t) => {
      const u = t * t * (3 - 2 * t);
      const bend = Math.sin(Math.PI * u) * bow;
      return move(sx + dx * u - (dy / d) * bend, sy + dy * u + (dx / d) * bend);
    });
  }
  async function select(
    name,
    { landing = 0.57, bow = 8, travel = 0.64, hover = 0.24, hold = 0.66 } = {},
  ) {
    const tab = page.getByRole("tab", { name, exact: true });
    const rect = await tab.boundingBox();
    const px = rect.x + rect.width * landing,
      py = rect.y + rect.height * 0.62;
    await glide(px - 3, py + 2, travel, bow);
    await glide(px, py, 0.13, -0.35);
    await shot(hover);
    await page.mouse.down();
    await shot(0.1);
    await page.mouse.up();
    await shot(hold);
    assert.equal(await tab.getAttribute("aria-selected"), "true");
  }

  await move(390, 213);
  await shot(0.45);
  // One asymmetric loop sweeps the light across the track and raised panel.
  const orbit = (t) => {
    const u = t - (0.38 * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
    const a = -1.15 + u * 2 * Math.PI;
    return move(
      300 + 231 * Math.cos(a) + 10 * Math.sin(2 * a),
      309 + 191 * Math.sin(a) - 8 * Math.cos(3 * a),
    );
  };
  const a = -1.15;
  await glide(
    300 + 231 * Math.cos(a) + 10 * Math.sin(2 * a),
    309 + 191 * Math.sin(a) - 8 * Math.cos(3 * a),
    0.54,
    4,
  );
  await shot(2.72, orbit);
  await select("Light", { travel: 0.77, bow: 15, hover: 0.34 });
  await select("Motion", { landing: 0.46, bow: -5, hold: 0.88 });
  await glide(493, 326, 0.48, 3);
  await shot(0.22);
  await page.keyboard.press("d");
  await shot(0.72);
  await select("Surface", {
    landing: 0.59,
    travel: 0.82,
    bow: 17,
    hover: 0.29,
  });
  await select("Light", { landing: 0.44, travel: 0.57, bow: -8, hold: 0.75 });
  await select("Motion", {
    landing: 0.54,
    travel: 0.66,
    bow: -4,
    hover: 0.31,
    hold: 0.56,
  });
  await glide(523, 321, 0.62, 4);
  await shot(0.8);
  assert.deepEqual(errors, []);
  encoder.stdin.end();
  const [code] = await finished;
  assert.equal(code, 0);
  console.log(filename);
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill();
  await browser.close();
}
