import assert from 'node:assert/strict';
import { ceramic, createCeramicMaterial } from '../packages/ceramic/dist/index.js';

const light = { source: 'fixed', position: { x: 24, y: 36 } };
const context = {
  inputs: { pointer: {
    subscribe() { throw Error('Fixed light must not subscribe'); },
    getSnapshot: () => ({ position: { x: 500, y: 500 } }),
  } },
};
const frame = { toLocal: ({ x, y }) => ({ x: x - 4, y: y - 6 }) };
const read = material => material.bind(context).frame(frame);
const imperative = createCeramicMaterial({ light });
const appearance = ceramic.create({ light });
assert.deepEqual(read(imperative), [20, 30, 0]);
assert.deepEqual(read(appearance.material), read(imperative));
assert.deepEqual(read(imperative.resolveColorScheme('dark')), read(imperative));
appearance.update({ light: { source: 'fixed', position: { x: 44, y: 56 } } });
assert.deepEqual(read(appearance.material), [40, 50, 0]);
assert.throws(() => createCeramicMaterial({ light: { source: 'invalid' } }), /light source/);
assert.throws(() => appearance.update({ light: { source: 'invalid' } }), /light source/);
assert.deepEqual(read(appearance.material), [40, 50, 0], 'Invalid update is atomic');
console.log('Ceramic light entry-point parity passed');
