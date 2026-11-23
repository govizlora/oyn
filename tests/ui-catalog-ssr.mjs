import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const directory = "examples/atelier/src/components";
const read = (file) => readFile(file, "utf8");
const families = JSON.parse(await read(directory + "/catalog.json"));
const imports = [];
const keys = [];
for (const family of families) {
  for (const example of family.examples) {
    const key = family.id + "/" + example.id;
    const recipe = path.resolve(directory, "generated", key + ".tsx");
    assert.equal(
      await read("dist/recipe-source/" + key + ".tsx.txt"),
      await read(recipe),
    );
    imports.push(
      "import { Example as E" +
        keys.length +
        " } from " +
        JSON.stringify(recipe),
    );
    keys.push(key);
  }
}
assert.equal(new Set(keys).size, keys.length);
// A warm build must not bundle an old preview or publish an archived source link.
for (const [dir, ext] of [
  [directory + "/generated", ".tsx"],
  ["dist/recipe-source", ".tsx.txt"],
]) {
  const files = await readdir(dir, { recursive: true });
  assert.deepEqual(
    files.filter((file) => file.endsWith(ext)).sort(),
    keys.map((key) => path.join(...key.split("/")) + ext).sort(),
    dir,
  );
}
const out = path.resolve("test-results/catalog-ssr");
await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  ssr: { noExternal: [/^@oyn\//] },
  plugins: [
    {
      name: "catalog-ssr-fixture",
      resolveId(id) {
        if (id === "virtual:stories") return "\0virtual:stories";
      },
      load(id) {
        if (id !== "\0virtual:stories") return;
        return [
          ...imports,
          'import {createElement} from "react"',
          'import {renderToString} from "react-dom/server"',
          'import {SurfaceProvider} from "@oyn/surface"',
          "const stories = [" + keys.map((_, i) => "E" + i).join(",") + "]",
          "export function render(i) { return renderToString(createElement(SurfaceProvider,null,createElement(stories[i]))) }",
        ].join("\n");
      },
    },
  ],
  build: {
    ssr: true,
    outDir: out,
    rollupOptions: {
      input: "virtual:stories",
      output: { entryFileNames: "stories.mjs" },
    },
  },
});
const { render } = await import(pathToFileURL(path.join(out, "stories.mjs")));
const html = new Map(keys.map((id, i) => [id, render(i)]));
for (const [id, markup] of html) assert.ok(markup.length, id);
const ends = [
  ...html
    .get("calendar/range")
    .matchAll(/<td\b[^>]*data-range-(?:start|end)=""[^>]*>([\s\S]*?)<\/td>/g),
];
assert.equal(ends.length, 2);
for (const [, cell] of ends) {
  assert.match(cell, /data-oyn-day="range"/);
  assert.match(cell, /data-oyn-day="key"/);
}
assert.match(html.get("switch/basic"), /data-oyn-face="well"/);
assert.match(html.get("switch/basic"), /data-oyn-face="thumb"/);
assert.equal(html.get("input/basic").match(/data-oyn-face="well"/g)?.length, 1);
assert.equal(
  html.get("tabs/indicator").match(/data-slot="tabs-indicator"/g)?.length,
  1,
);

// Verify installable source, including each item's transitive relative imports.
const manifest = JSON.parse(await read("dist/r/registry.json"));
const items = new Map(
  await Promise.all(
    manifest.items.map(async ({ name }) => [
      name,
      JSON.parse(await read("dist/r/" + name + ".json")),
    ]),
  ),
);
for (const family of families)
  assert.ok(items.has("ceramic-" + family.id), family.id);
for (const [name] of items) {
  const files = new Map();
  function collect(key) {
    const item = items.get(key);
    assert.ok(item, key);
    for (const dep of item.registryDependencies ?? [])
      collect(dep.replace(/^@oyn\//, ""));
    for (const file of item.files) files.set(file.target, file);
  }
  collect(name);
  for (const [target, file] of files) {
    assert.equal(file.content, await read(file.path));
    for (const match of file.content.matchAll(
      /(?:from\s+|import\s+|@import\s+)["'](\.\.?\/[^"']+)["']/g,
    )) {
      const relative = path.posix.join(path.posix.dirname(target), match[1]);
      assert.ok(
        [
          relative,
          relative.replace(/\.js$/, ".ts"),
          relative.replace(/\.js$/, ".tsx"),
        ].some((p) => files.has(p)),
        name + " requires " + relative,
      );
    }
  }
}
console.log(
  keys.length +
    " previews rendered, React sources matched, " +
    items.size +
    " registry items resolved.",
);
