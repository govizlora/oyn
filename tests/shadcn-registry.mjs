import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'examples/shadcn';
const manifest = JSON.parse(await readFile(`${root}/original/manifest.json`, 'utf8'));
for (const file of manifest.files) {
  const content = await readFile(`${root}/original/${file.path}`, 'utf8');
  assert.equal(createHash('sha256').update(content).digest('hex'), file.sha256, `${file.path} must stay untouched`);
  const registry = JSON.parse(await readFile(`${root}/original/registries/${file.registry}.json`, 'utf8'));
  assert.equal(content, registry.files.find(f => f.path === file.path).content, 'original must match the saved upstream response byte for byte');
}
for (const file of await readdir(`${root}/src/ceramic`)) {
  const content = await readFile(`${root}/src/ceramic/${file}`, 'utf8');
  assert.doesNotMatch(content, /useAppearance|@\/app\/|componentRegistry/, `${file} must not know the app mode`);
}
const appearance = await readFile(`${root}/src/app/appearance.tsx`, 'utf8');
assert.doesNotMatch(appearance, /useSurface/, 'app mode must not control individual material registration');
const preview = await readFile(`${root}/src/app/dashboard-preview.tsx`, 'utf8');
assert.match(preview, /<Dashboard \/>/, 'preview shell stays mounted');
const dashboard = await readFile(`${root}/src/app/page.tsx`, 'utf8');
assert.match(dashboard, /<Fragment key=\{appearance\}/, 'only demo contents reset');
assert.match(dashboard, /<div data-dashboard-scroll/, 'scroll owner is outside the keyed contents');
console.log(`PASS: ${manifest.files.length} pristine upstream files; Ceramic independent of mode; app owns selection and reset.`);
