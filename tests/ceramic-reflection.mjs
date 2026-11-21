import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import { createCeramicMaterial } from "../packages/ceramic/dist/index.js";
import { geometryWGSL } from "../packages/ceramic/dist/effects/geometry.js";
import { ceramicLightingWGSL } from "../packages/ceramic/dist/effects/ceramic-lighting.js";

// Coverage cannot amplify or saturate radiance. Test the production function,
// including deliberately overbright lobes and fully/subpixel-covered edges.
const cases = [0, 1, 100].flatMap((reflectionStrength) =>
  [0, 0.01, 0.25, 0.5, 1].map((mask) => ({
    mask,
    values: Array.from(
      createCeramicMaterial({
        colorScheme: "dark",
        reflectionStrength,
      }).parameters.snapshot(),
    ),
  })),
);
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0] + "tests/fixtures/surface.html");
  const actual = await page.evaluate(
    async ({ functions, cases }) => {
      const device = await (
        await navigator.gpu.requestAdapter()
      ).requestDevice();
      device.pushErrorScope("validation");
      const calls = cases
        .map((c, i) => {
          const vectors = Array.from(
            { length: 7 },
            (_, j) => `vec4f(${c.values.slice(j * 4, j * 4 + 4).join(",")})`,
          );
          return `result[${i}]=darkReflection(CeramicOptics(${vectors.join(",")}),vec2f(0,-1),0.8,${c.mask},normalize(vec3f(0,-1,1)),vec2f(0,-30),normalize(vec3f(0,-0.9,0.435)),normalize(vec3f(0,-1,1))).a;`;
        })
        .join("\n");
      const module = device.createShaderModule({
        code: `${functions}
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
      device.destroy();
      return values;
    },
    { functions: geometryWGSL + ceramicLightingWGSL, cases },
  );
  cases.forEach((c, i) => {
    const full = actual[Math.floor(i / 5) * 5 + 4];
    assert.ok(
      Math.abs(actual[i] - full * c.mask) < 1e-6,
      `Reflection coverage must remain linear: ${JSON.stringify(c)}`,
    );
    assert.ok(actual[i] <= c.mask + 1e-6);
  });
  console.log(
    "PASS: 15 GPU reflection-coverage cases; subpixel coverage cannot saturate into a full highlight.",
  );
} finally {
  await browser.close();
  await server.close();
}
