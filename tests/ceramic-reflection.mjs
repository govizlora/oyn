import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";
import { createCeramicMaterial } from "../packages/materials/dist/ceramic/index.js";
import {
  insetSurfaceWGSL,
  insetWallSlope,
} from "../packages/materials/dist/ceramic/inset.js";
import { geometryWGSL } from "../packages/materials/dist/ceramic/effects/geometry.js";
import { ceramicLightingWGSL } from "../packages/materials/dist/ceramic/effects/ceramic-lighting.js";

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
// Exercise the actual GPU profile: top/floor tangency, a continuous lip join,
// and integrated depth, including the shallow-depth radius limit.
const angle = (50 * Math.PI) / 180;
const profiles = [0.01, 0.1, 0.5, 1, 2, 6, 16].map((depth) => {
  const radius = Math.min(1.25, (depth * 0.5) / (1 - Math.cos(angle)));
  const lip = radius * Math.sin(angle);
  const wall = (depth - radius * (1 - Math.cos(angle))) / insetWallSlope;
  const width = lip + wall;
  const distances = [
    -1,
    0,
    lip - 1e-6,
    lip,
    lip + 1e-6,
    width,
    width + 1,
    ...Array.from({ length: 256 }, (_, i) => ((i + 0.5) * width) / 256),
  ];
  return { depth, radius, lip, wall, width, distances };
});
const profileCases = profiles.flatMap((p) =>
  p.distances.map((distance) => ({ distance, depth: p.depth })),
);
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0] + "tests/fixtures/surface.html");
  const actual = await page.evaluate(
    async ({ functions, cases, profileCases }) => {
      const device = await (
        await navigator.gpu.requestAdapter()
      ).requestDevice();
      device.pushErrorScope("validation");
      const calls =
        cases
          .map((c, i) => {
            const vectors = Array.from(
              { length: 7 },
              (_, j) => `vec4f(${c.values.slice(j * 4, j * 4 + 4).join(",")})`,
            );
            return `result[${i}]=darkReflection(CeramicOptics(${vectors.join(",")}),vec2f(0,-1),0.8,${c.mask},normalize(vec3f(0,-1,1)),vec2f(0,-30),normalize(vec3f(0,-0.9,0.435)),normalize(vec3f(0,-1,1))).a;`;
          })
          .join("\n") +
        profileCases
          .map(
            (c, i) =>
              `result[${cases.length + i}]=insetProfileAngle(${c.distance},${c.depth});`,
          )
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
      const size = (cases.length + profileCases.length) * 4;
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
    {
      functions:
        geometryWGSL +
        ceramicLightingWGSL +
        insetSurfaceWGSL.split("fn insetCeramic")[0],
      cases,
      profileCases,
    },
  );
  cases.forEach((c, i) => {
    const full = actual[Math.floor(i / 5) * 5 + 4];
    assert.ok(
      Math.abs(actual[i] - full * c.mask) < 1e-6,
      `Reflection coverage must remain linear: ${JSON.stringify(c)}`,
    );
    assert.ok(actual[i] <= c.mask + 1e-6);
  });
  let offset = cases.length;
  for (const p of profiles) {
    const values = actual.slice(offset, offset + p.distances.length);
    offset += p.distances.length;
    assert.equal(values[0], 0, "flat receiver outside the lip");
    assert.equal(values[1], 0, "top-plane tangency");
    assert.ok(
      Math.abs(values[2] - values[4]) < 0.001,
      "continuous lip/wall normal",
    );
    assert.ok(
      Math.abs(values[3] - angle) < 1e-6,
      "circular lip meets wall at 50 degrees",
    );
    assert.equal(values[5], 0, "floor tangency");
    assert.equal(values[6], 0, "flat floor");
    const integrated =
      (values.slice(7).reduce((sum, a) => sum + Math.tan(a), 0) * p.width) /
      256;
    assert.ok(
      Math.abs(integrated - p.depth) < p.depth * 0.002,
      "profile preserves requested depth",
    );
  }
  console.log(
    "PASS: GPU recessed lip tangency, continuous joins and integrated depth at 7 depths.",
  );
  console.log(
    "PASS: 15 GPU reflection-coverage cases; subpixel coverage cannot saturate into a full highlight.",
  );
} finally {
  await browser.close();
  await server.close();
}
