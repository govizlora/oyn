import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
// Test the same source module, without a second implementation of its policy.
const source = await readFile(
  new URL('../examples/atelier/src/motion-clock.ts', import.meta.url),
  'utf8',
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const timers = new Set();
let lastId = 0,
  now = 0,
  callback;
const original = {
  setInterval,
  clearInterval,
  performance: globalThis.performance,
};
globalThis.setInterval = (cb, delay) => {
  assert.equal(delay, 1000 / 30);
  callback = cb;
  const id = ++lastId;
  timers.add(id);
  return id;
};
globalThis.clearInterval = (id) => timers.delete(id);
globalThis.performance = { now: () => now };
globalThis.document = new EventTarget();
document.hidden = false;
const media = new EventTarget();
media.matches = false;
globalThis.matchMedia = () => media;
try {
  const { followMotion } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );
  let a = 0,
    b = 0;
  const stopA = followMotion((dt) => (a += dt)),
    stopB = followMotion((dt) => (b += dt));
  assert.equal(timers.size, 1, 'two objects share one time source');
  now = 33;
  callback();
  assert.equal(a, b);
  assert.ok(a > 0);
  stopA();
  assert.equal(timers.size, 1);
  const oldA = a;
  now = 66;
  callback();
  assert.equal(a, oldA);
  assert.ok(b > a);
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  assert.equal(timers.size, 0);
  media.matches = false;
  media.dispatchEvent(new Event('change'));
  assert.equal(timers.size, 1);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(timers.size, 0);
  now = 20000;
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  const before = b;
  now += 33;
  callback();
  assert.ok(b - before < 0.04, 'resuming never advances hidden time');
  stopB();
  assert.equal(timers.size, 0);
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(timers.size, 0);
  console.log(
    'PASS: one shared motion clock, independent subscribers, visibility/reduced-motion, resume delta and cleanup.',
  );
} finally {
  Object.assign(globalThis, original);
  delete globalThis.document;
  delete globalThis.matchMedia;
}
