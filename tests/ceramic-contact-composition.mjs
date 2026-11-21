import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";
import { ceramicShadowWGSL } from "../packages/ceramic/dist/effects/shadow.js";
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0] + "tests/fixtures/surface.html");
  const cases = [];
  for (const height of [-1, 0, 0.01, 0.1, 0.5, 1, 8])
    for (const coverage of [0, 0.2, 0.5, 1])
      for (const strength of [0, 0.09, 0.8, 1])
        for (const contact of [0, 0.015, 0.4, 1])
          cases.push({ height, coverage, strength, contact });
  const actual = await page.evaluate(
    async ({ kernel, cases }) => {
      const adapter = await navigator.gpu.requestAdapter();
      const device = await adapter.requestDevice();
      device.pushErrorScope("validation");
      const code = `var<private> coverage:f32;
 fn geometryShadowCoverage(p:vec2f,s:f32,b:f32,h:f32)->f32{return coverage;}
 fn geometryShadowDistance(p:vec2f)->f32{return 0.0;}
 ${kernel}
 @group(0) @binding(0) var<storage,read_write> result:array<f32>;
 @compute @workgroup_size(1) fn main(){${cases.map((c, i) => `coverage=${c.coverage.toFixed(5)};result[${i}]=ceramicShadow(vec2f(0),vec2f(100),${c.height.toFixed(5)},vec4f(480,240,${c.strength.toFixed(5)},${c.contact.toFixed(5)})).a;`).join("\n")}}`;
      const module = device.createShaderModule({ code });
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
      device.destroy();
      return values;
    },
    { kernel: ceramicShadowWGSL, cases },
  );
  cases.forEach((c, i) => {
    const p = c.coverage * c.strength;
    const t = Math.min(Math.max(c.height, 0), 1);
    const relief = 1 - Math.exp(-Math.max(c.height, 0) * t * t * (3 - 2 * t));
    assert.ok(
      Math.abs(actual[i] - (p + c.contact * (1 - p)) * relief) < 1e-6,
      JSON.stringify(c),
    );
    assert.ok(actual[i] >= 0 && actual[i] <= 1 + 1e-6);
  });
  console.log(
    `Passed ${cases.length} GPU contact-composition cases, including unshadowed edges at full shadow strength.`,
  );
} finally {
  await browser?.close();
  await server.close();
}
