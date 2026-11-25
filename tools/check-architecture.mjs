import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.name === "generated") return [];
    return entry.isDirectory()
      ? files(file)
      : /\.tsx?$/.test(file)
        ? [file]
        : [];
  });
}
const failures = [];
for (const [layer, directory] of Object.entries({
  surface: "packages/oyn/src/core",
  react: "packages/oyn/src/react",
  ceramic: "packages/oyn/src/materials",
  ui: "packages/ui/src",
})) {
  for (const file of files(directory)) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const report = (node, message) =>
      failures.push(
        `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${message}`,
      );
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const name = node.moduleSpecifier.text;
        if (
          layer === "surface" &&
          /materials\/|@oyn\/ui|@ui-sdk|@base-ui|^motion(?:\/|$)|^framer-motion/.test(
            name,
          )
        )
          report(
            node,
            "Surface must not depend on materials, UI or animation libraries.",
          );
        if (
          layer === "surface" &&
          !file.includes("/react/") &&
          (/^(react|react-dom)(\/|$)/.test(name) || /(^|\/)react\//.test(name))
        )
          report(
            node,
            "The Surface runtime must not depend on its React bridge.",
          );
        if (
          layer === "ceramic" &&
          /^(react|react-dom)(\/|$)|@oyn\/ui|@ui-sdk|@base-ui|^motion(?:\/|$)|^framer-motion/.test(
            name,
          )
        )
          report(node, "Ceramic must not own React/UI/animation policy.");
        if (layer === "ui" && /oyn\/(src|dist)\//.test(name))
          report(node, "Consumers must use Surface public entry points.");
      }
      if (ts.isCallExpression(node)) {
        const name = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : ts.isIdentifier(node.expression)
            ? node.expression.text
            : "";
        const arg = node.arguments[0];
        const literal = arg && ts.isStringLiteral(arg) ? arg.text : "";
        if (layer === "ceramic") {
          if (
            ["requestAnimationFrame", "setInterval", "setTimeout"].includes(
              name,
            )
          )
            report(node, "Animation scheduling belongs to the consumer.");
          if (
            name === "now" &&
            /performance|Date/.test(node.expression.getText(source))
          )
            report(
              node,
              "Materials receive instantaneous values; do not sample an animation clock.",
            );
          if (
            name === "addEventListener" &&
            /^(pointer|mouse|touch|key|click|focus|blur)/.test(literal)
          )
            report(node, "Material gestures belong in the consumer.");
          if (name === "matchMedia" && literal.includes("reduced-motion"))
            report(
              node,
              "Reduced-motion animation policy belongs to the consumer.",
            );
        }
        if (
          layer === "ui" &&
          ([
            "requestDevice",
            "createRenderPipeline",
            "createCommandEncoder",
          ].includes(name) ||
            (name === "createElement" && literal === "canvas"))
        )
          report(node, "UI must not own GPU resources or a second canvas.");
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
assert.deepEqual(failures, [], failures.join("\n"));

// Compile the actual canonical usage examples, not a hand-maintained second copy.
const markdown = fs.readFileSync("ARCHITECTURE.md", "utf8");
const virtual = new Map(
  [...markdown.matchAll(/```tsx\n([\s\S]*?)```/g)].map((match, i) => [
    path.resolve(`tests/architecture-example-${i}.tsx`),
    match[1],
  ]),
);
assert.ok(
  virtual.size >= 2,
  "Document both instantaneous props and external numeric sources.",
);
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  process.cwd(),
);
const host = ts.createCompilerHost(options);
const originalRead = host.readFile,
  originalExists = host.fileExists;
host.readFile = (file) => virtual.get(path.resolve(file)) ?? originalRead(file);
host.fileExists = (file) =>
  virtual.has(path.resolve(file)) || originalExists(file);
const program = ts.createProgram(
  [...virtual.keys(), path.resolve("tests/surface-appearance-types.tsx")],
  options,
  host,
);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(
  diagnostics.length,
  0,
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName: (name) => name,
    getNewLine: () => "\n",
  }),
);
console.log(
  `PASS: package boundary rules, ${virtual.size} canonical usage examples and negative API contracts.`,
);
