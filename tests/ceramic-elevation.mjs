import assert from "node:assert/strict";
import { createCeramicMaterial } from "../packages/materials/dist/ceramic/index.js";
import { shadowBounds } from "../packages/materials/dist/ceramic/bounds.js";

// One signed height lane, one program and one immutable finish on both sides.
for (const colorScheme of ["light", "dark"]) {
  for (const color of [
    undefined,
    "transparent",
    "#f5f5f5",
    "#181818",
    "#aabbcc",
    "#223344",
  ]) {
    const options = { colorScheme, color, maxElevation: 16 };
    const material = createCeramicMaterial({ ...options, elevation: 8 });
    const parameters = material.parameters,
      shader = material.shader,
      passes = material.passes;
    const finish = parameters.snapshot();
    assert.equal(finish[7], Number(color !== undefined && color !== "transparent"));
    let notices = 0;
    const off = parameters.subscribe(() => notices++);
    for (const elevation of [-24, -6, -2, -0.001, 0, 0.001, 4, 8, -2]) {
      material.setElevation(elevation);
      const fresh = createCeramicMaterial({ ...options, elevation });
      assert.equal(material.parameters, parameters);
      assert.equal(material.shader, shader);
      assert.equal(material.passes, passes);
      assert.deepEqual(passes, ["surface"]);
      assert.deepEqual(parameters.snapshot(), fresh.parameters.snapshot());
      assert.equal(parameters.get(1), Math.fround(elevation));
      for (let i = 0; i < finish.length; i++)
        if (i !== 1) assert.equal(parameters.get(i), finish[i]);
    }
    assert.equal(
      notices,
      9,
      "exactly one uniform notification per elevation update",
    );
    material.setElevation(-2);
    assert.equal(notices, 9, "same height does not schedule another draw");
    off();
    for (const elevation of [NaN, Infinity, -Infinity, -1e40, -3e38, 480]) {
      assert.throws(() => createCeramicMaterial({ ...options, elevation }));
      assert.throws(() => material.setElevation(elevation));
      assert.equal(
        parameters.get(1),
        -2,
        "invalid updates leave the current material intact",
      );
    }
  }
}
const material = createCeramicMaterial({ elevation: 4, maxElevation: 16 });
const padding = material.measurePadding(100, 40);
for (const height of [-24, -2, 0, 8, -6]) {
  material.setElevation(height);
  assert.deepEqual(material.measurePadding(100, 40), padding);
}
assert.deepEqual(
  createCeramicMaterial({ elevation: -2 }).measurePadding(100, 40),
  { x: 2, y: 2 },
);
assert.throws(() => createCeramicMaterial({ elevation: -2, maxElevation: -1 }));
// An unshadowed edge still has AO at cast strength 1. Padding must never remove
// that budget based on a global strength rather than local projected coverage.
for (const height of [0.001, 0.1, 0.5, 1, 2, 8, 32]) {
  const aoOnly = shadowBounds(100, 40, height, [480, 0, 0, 1]);
  const combined = shadowBounds(100, 40, height, [480, 0, 1, 1]);
  assert.ok(combined.x >= aoOnly.x && combined.y >= aoOnly.y);
}
console.log(
  "PASS: signed elevation, stable program/uniforms/passes, atomic validation and fixed padding budget.",
);
