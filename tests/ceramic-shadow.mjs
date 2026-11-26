import assert from "node:assert/strict";
import { chromium, firefox } from "playwright";
import { createServer } from "vite";
import { gaussianCoverageWGSL } from "../packages/materials/dist/ceramic/effects/shadow.js";

// Compare the production WGSL integral with a dense independent CPU integration.
const functions = gaussianCoverageWGSL;
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const cases = [];
for (const [bx, by, radius, sigma] of [
  [256, 204, 12, 8],
  [60, 18, 6, 4],
  [160, 90, 12, 4],
  [30, 20, 0, 6],
  [20, 20, 20, 0.35],
]) {
  for (const [x, y] of [
    [bx, 0],
    [bx, by],
    [bx + sigma, by + sigma],
    [bx - radius / 2, by - radius / 2],
    [0, 0],
    [-bx, -by],
  ]) {
    cases.push({ bx, by, radius, sigma, x, y });
  }
}
const browser =
  process.env.BROWSER === "firefox"
    ? await firefox.launch({ headless: true })
    : await chromium.launch({ channel: "chrome", headless: true });
let actual;
try {
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0] + "tests/fixtures/surface.html");
  actual = await page.evaluate(
    async ({ functions, cases }) => {
      const adapter = await navigator.gpu.requestAdapter();
      const device = await adapter.requestDevice();
      device.pushErrorScope("validation");
      const calls = cases
        .map(
          (c, i) =>
            `result[${i}]=roundedCoverage(vec2f(${c.x},${c.y}),vec2f(${c.bx},${c.by}),${c.radius},${c.sigma});`,
        )
        .join("\n");
      const module = device.createShaderModule({
        code:
          functions +
          `
      @group(0) @binding(0) var<storage,read_write> result:array<f32>;
      @compute @workgroup_size(1) fn main(){${calls}}`,
      });
      const pipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module, entryPoint: "main" },
      });
      const size = cases.length * 4;
      const output = device.createBuffer({
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      const read = device.createBuffer({
        size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: output } }],
      });
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.dispatchWorkgroups(1);
      pass.end();
      encoder.copyBufferToBuffer(output, 0, read, 0, size);
      device.queue.submit([encoder.finish()]);
      const error = await device.popErrorScope();
      if (error) throw Error(error.message);
      await read.mapAsync(GPUMapMode.READ);
      const values = [...new Float32Array(read.getMappedRange())];
      read.unmap();
      read.destroy();
      output.destroy();
      device.destroy();
      return values;
    },
    { functions, cases },
  );
} finally {
  await browser.close();
  await server.close();
}

// Numerical Gaussian CDF via Simpson integration; independent of the shader approximation.
function cdf(x) {
  const end = Math.min(Math.abs(x), 9),
    n = 200,
    h = end / n;
  let sum = 1 + Math.exp((-end * end) / 2);
  for (let i = 1; i < n; i++)
    sum += (i % 2 ? 4 : 2) * Math.exp(-((i * h) ** 2) / 2);
  return 0.5 + (Math.sign(x) * sum * h) / 3 / Math.sqrt(2 * Math.PI);
}
function reference({ bx, by, radius: r, sigma: s, x, y }) {
  const lo = Math.max(-by, y - 8 * s),
    hi = Math.min(by, y + 8 * s),
    n = 6000;
  if (hi <= lo) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = lo + ((i + 0.5) * (hi - lo)) / n;
    const dy = Math.max(0, Math.abs(v) - (by - r));
    const extent = bx - r + Math.sqrt(Math.max(0, r * r - dy * dy));
    total +=
      (Math.exp(-0.5 * ((v - y) / s) ** 2) / (s * Math.sqrt(2 * Math.PI))) *
      (cdf((extent - x) / s) - cdf((-extent - x) / s));
  }
  return (total * (hi - lo)) / n;
}
for (let i = 0; i < cases.length; i++) {
  const expected = reference(cases[i]);
  assert.ok(
    Math.abs(actual[i] - expected) < 0.002,
    `case ${i}: GPU ${actual[i]}, reference ${expected}`,
  );
}
assert.ok(
  actual[1] < actual[0] * 0.6,
  "corner coverage is lower than a straight edge, not the same distance ramp",
);
console.log(
  "PASS: 30 GPU shadow samples match silhouette convolution (dialog, card, button, square and circle).",
);
