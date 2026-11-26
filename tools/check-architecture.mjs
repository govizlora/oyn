import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory()
      ? files(file)
      : /\.tsx?$/.test(file)
        ? [file]
        : [];
  });
}
const failures = [];
for (const [layer, directory] of Object.entries({
  core: "packages/core/src",
  react: "packages/react/src",
  materials: "packages/materials/src",
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
    function checkImport(node, name) {
      if (name.startsWith(".")) {
        const local = path.normalize(path.join(path.dirname(file), name));
        if (!local.startsWith(directory + "/"))
          report(node, "Use a public entry point across package boundaries.");
        return;
      }
      if (layer === "materials" && name === "@oyn/core") {
        if (ts.isImportDeclaration(node)) {
          const clause = node.importClause;
          const bindings = clause?.namedBindings;
          if (
            clause?.isTypeOnly ||
            (bindings &&
              ts.isNamedImports(bindings) &&
              !clause.name &&
              bindings.elements.every(
                (item) =>
                  item.isTypeOnly ||
                  (item.propertyName ?? item.name).text === "createParameters",
              ))
          )
            return;
        }
      }
      if (layer === "react" && ["react", "@oyn/core"].includes(name)) return;
      if (
        file === "packages/react/src/index.ts" &&
        ts.isExportDeclaration(node) &&
        name === "@oyn/materials"
      )
        return;
      report(node, `Unexpected ${layer} dependency: ${name}`);
    }
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        checkImport(node, node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        checkImport(node, node.arguments[0].text);
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        checkImport(node, node.argument.literal.text);
      if (ts.isCallExpression(node)) {
        const name = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : ts.isIdentifier(node.expression)
            ? node.expression.text
            : "";
        const arg = node.arguments[0];
        const literal = arg && ts.isStringLiteral(arg) ? arg.text : "";
        if (layer === "materials") {
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
            report(node, "MaterialInstance gestures belong in the consumer.");
          if (name === "matchMedia" && literal.includes("reduced-motion"))
            report(
              node,
              "Reduced-motion animation policy belongs to the consumer.",
            );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
assert.deepEqual(failures, [], failures.join("\n"));

// Compile the actual canonical usage examples, not a hand-maintained second copy.
const virtual = new Map(
  ["README.md", "packages/react/README.md"].flatMap((file, document) =>
    [
      ...fs.readFileSync(file, "utf8").matchAll(/```(tsx?)\n([\s\S]*?)```/g),
    ].map((match, i) => [
      path.resolve(`tests/document-${document}-example-${i}.${match[1]}`),
      match[2],
    ]),
  ),
);
assert.ok(
  virtual.size >= 3,
  "Document React props, plain DOM binding and external numeric sources.",
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
  [...virtual.keys(), path.resolve("tests/material-types.tsx")],
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
