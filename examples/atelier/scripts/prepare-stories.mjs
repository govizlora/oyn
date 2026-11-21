// Rebuild the runnable previews from the pinned, Apache-2.0 React package.
// Local recipes supply missing examples and object-specific Atelier compositions.
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
  rename,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { randomUUID } from "node:crypto";

const root = fileURLToPath(new URL("../src/components/", import.meta.url));
const catalog = JSON.parse(
  await readFile(path.join(root, "catalog.json"), "utf8"),
);
const families = new Set(catalog.map((family) => family.id));
const docs = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve("@ui-sdk/react/tabs"))),
  "../docs/components",
);

const publicSources = path.resolve(root, "../../public/recipe-source");
await mkdir(publicSources, { recursive: true });
await copyFile(
  path.resolve(docs, "../../LICENSE"),
  path.join(publicSources, "LICENSE.txt"),
);

async function writeSource(pathname, content) {
  try {
    if ((await readFile(pathname, "utf8")) === content) return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const tmp = pathname + "." + randomUUID() + ".tmp";
  await writeFile(tmp, content);
  await rename(tmp, pathname);
}

// Give native buttons and cards in the recipes the same finish as SDK parts.
// Leave custom render targets alone. Their owning part already styles the host.
function styleRecipe(source) {
  source = source
    .replace(/^"use client";?\s*/, "")
    .replace(/@ui-sdk\/react\/([\w-]+)/g, (specifier, name) =>
      families.has(name) ? "@oyn/ui/" + name : specifier,
    )
    .replaceAll('"./log"', '"../../log"');
  const file = ts.createSourceFile(
    "recipe.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const edits = [];
  let button = false,
    card = false;
  function edit(node, replacement) {
    edits.push([node.getStart(file), node.end, replacement]);
  }
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const open = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = open.tagName.getText(file);
      if (tag === "TabsIndicator" && ts.isJsxSelfClosingElement(node)) {
        edit(node, "");
        return;
      }
      // Only the element passed to a part's render prop is that part's host.
      // Buttons returned by Array.map are still independent native controls.
      let expression = node.parent;
      if (ts.isParenthesizedExpression(expression))
        expression = expression.parent;
      if (ts.isArrowFunction(expression)) expression = expression.parent;
      const renderTarget =
        ts.isJsxExpression(expression) &&
        ts.isJsxAttribute(expression.parent) &&
        expression.parent.name.getText(file) === "render";
      const slot = open.attributes.properties.find(
        (attr) =>
          ts.isJsxAttribute(attr) && attr.name.getText(file) === "data-slot",
      );
      const name =
        tag === "button" && !renderTarget
          ? "StoryButton"
          : tag === "div" &&
              ["card", "scroll"].includes(slot?.initializer?.text)
            ? "CeramicCard"
            : null;
      if (name) {
        edit(open.tagName, name);
        if (ts.isJsxElement(node)) edit(node.closingElement.tagName, name);
        if (name === "StoryButton") button = true;
        else card = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  for (const [from, to, text] of edits.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, from) + text + source.slice(to);
  // The Ceramic list supplies the single moving indicator.
  source = source
    .replace(/^  TabsIndicator,\n/gm, "")
    .replace(/^[ \t]+$/gm, "");
  const imports = [
    button && 'import { StoryButton } from "../../recipe-button";',
    card && 'import { CeramicCard } from "@oyn/ui/card";',
  ].filter(Boolean);
  return [...imports, source].join("\n");
}

for (const family of catalog) {
  const md = await readFile(path.join(docs, family.id + ".md"), "utf8");
  const blocks = new Map(
    Array.from(
      md.matchAll(/^```tsx title="([\w-]+)\.tsx"\n([\s\S]*?)\n```/gm),
      (m) => [m[1], m[2]],
    ),
  );
  const dir = path.join(root, "generated", family.id);
  await mkdir(dir, { recursive: true });
  const sources = path.join(publicSources, family.id);
  await mkdir(sources, { recursive: true });
  const localDir = path.join(root, "recipes", family.id);
  const local = new Set(
    await readdir(localDir).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    }),
  );
  for (const { id } of family.examples) {
    const source = local.has(id + ".tsx")
      ? await readFile(path.join(localDir, id + ".tsx"), "utf8")
      : blocks.get(id);
    if (!source) throw Error("Missing recipe: " + family.id + "/" + id);
    const output = styleRecipe(source);
    await writeSource(path.join(dir, id + ".tsx"), output + "\n");
    await writeSource(path.join(sources, id + ".tsx.txt"), output + "\n");
  }
}
console.log(
  "Prepared %d React previews in %d component families.",
  catalog.reduce((n, f) => n + f.examples.length, 0),
  catalog.length,
);
