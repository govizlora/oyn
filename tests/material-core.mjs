import assert from "node:assert/strict";
import { createEngine, createSurface, createParameters } from "oyn";
import { ceramic, createCeramicMaterial } from "oyn/materials/ceramic";

// No React, browser globals, or renderer mocks are needed for host lifecycle.
const records = { creates: 0, updates: 0, disposes: 0 };
const definition = {
  create({ value }) {
    records.creates++;
    const parameters = createParameters([value, 0, 0, 0]);
    return {
      shader: "",
      parameters,
      passes: [],
      measurePadding: () => ({ x: 0, y: 0 }),
      update({ value }) {
        records.updates++;
        parameters.set(0, value);
      },
      dispose() {
        records.disposes++;
      },
    };
  },
};
const engine = createEngine();
const surface = createSurface(engine, {
  material: definition,
  props: { value: 1 },
});
assert.equal(
  records.creates,
  0,
  "A handle must be safe to create during render",
);
surface.update({ value: 2 });
const first = {},
  second = {};
const detachFirst = surface.bind(first),
  detachSecond = surface.bind(second);
const a = engine.entries.get(first).material,
  b = engine.entries.get(second).material;
assert.notEqual(a, b);
assert.notEqual(a.parameters, b.parameters);
assert.equal(a.parameters.get(0), 2);
surface.update({ value: 3 });
assert.equal(a.parameters.get(0), 3);
assert.equal(
  b.parameters.get(0),
  3,
  "Every bound host receives configuration updates",
);
detachFirst();
detachFirst();
assert.equal(records.disposes, 1, "Cleanup is idempotent");
surface.update({ value: 4 });
const detachAgain = surface.bind(first);
assert.equal(engine.entries.get(first).material.parameters.get(0), 4);
detachFirst();
assert.equal(
  engine.entries.size,
  2,
  "Stale cleanup must not release a new binding",
);
detachAgain();
detachSecond();
assert.equal(engine.entries.size, 0);
assert.equal(records.creates, records.disposes);

// All fatal paths dispose Core-owned instances, not just their GPU bindings.
for (const reason of ["duplicate", "create", "update", "renderer"]) {
  const runtime = createEngine();
  let disposed = 0;
  const material = {
    create() {
      return {
        ...definition.create({ value: 1 }),
        update() {
          throw Error("update failure");
        },
        dispose() {
          disposed++;
        },
      };
    },
  };
  const handle = createSurface(runtime, { material, props: {} });
  const host = {},
    otherHost = {};
  const off = handle.bind(host),
    otherOff = handle.bind(otherHost);
  const errors = [],
    original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    if (reason === "duplicate") handle.bind(host);
    if (reason === "create")
      createSurface(runtime, {
        material: {
          create() {
            throw Error("create failure");
          },
        },
        props: {},
      }).bind({});
    if (reason === "update") handle.update({});
    if (reason === "renderer") runtime.fail(Error("renderer failure"));
    assert.equal(runtime.failed, true);
    assert.equal(runtime.entries.size, 0);
    assert.equal(disposed, 2);
    off();
    otherOff();
    assert.equal(disposed, 2);
    assert.equal(handle.bind({}), undefined);
    handle.update({});
    runtime.start();
    assert.equal(errors.length, 1, "One diagnostic per failed engine");
  } finally {
    console.error = original;
  }
}

const instance = ceramic.create({ elevation: 8, maxElevation: 24 });
assert.equal(
  "material" in instance,
  false,
  "The drawing object is the instance",
);
assert.equal(typeof instance.shader, "string");
assert.equal(typeof instance.update, "function");
const setElevation = instance.setElevation;
instance.update({ elevation: 8, maxElevation: 24, color: "#123456" });
setElevation(-3);
assert.equal(
  instance.parameters.get(1),
  -3,
  "Captured setters survive configuration changes",
);
const before = instance.parameters.snapshot();
assert.throws(() => instance.update({ elevation: Infinity, color: "#654321" }));
assert.deepEqual(
  instance.parameters.snapshot(),
  before,
  "Invalid configuration is atomic",
);
assert.equal(createCeramicMaterial({ elevation: 5 }).parameters.get(1), 5);
console.log(
  "PASS: React-free Core lifecycle, independent hosts, committed configuration, failure cleanup and unified material instances.",
);
