import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const temporary = await mkdtemp(path.join(tmpdir(), "oyn-package-"));
try {
  const [packed] = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "./packages/oyn", "--json", "--pack-destination", temporary],
      { encoding: "utf8" },
    ),
  );
  const installed = path.join(temporary, "node_modules/oyn");
  await mkdir(installed, { recursive: true });
  execFileSync("tar", [
    "-xzf",
    path.join(temporary, packed.filename),
    "--strip-components=1",
    "-C",
    installed,
  ]);
  const manifest = JSON.parse(
    await readFile(path.join(installed, "package.json"), "utf8"),
  );
  assert.equal(manifest.name, "oyn");
  assert.equal(manifest.peerDependenciesMeta.react.optional, true);
  assert.equal(manifest.dependencies?.react, undefined);
  assert.equal(manifest.dependencies?.["@oyn/surface"], undefined);
  assert.equal(manifest.dependencies?.["@oyn/ceramic"], undefined);
  const script = `
    import assert from 'node:assert/strict';
    const core = await import('oyn');
    assert.equal(typeof core.createSurface, 'function');
    assert.equal(typeof core.createEngine, 'function');
    assert.equal('useMaterial' in core, false);
    assert.equal('OynProvider' in core, false);
    assert.equal('materialAppearance' in core, false);
    const { ceramic } = await import('oyn/materials/ceramic');
    const instance = ceramic.create({ elevation: 8 });
    assert.equal(instance.parameters.get(1), 8);
    instance.update({ elevation: -3 });
    assert.equal(instance.parameters.get(1), -3);
    assert.equal('material' in instance, false);
    await instance.loadWebGL2();
    for (const entry of ['baked', 'card', 'flip-disc', 'sculpted'])
      await import('oyn/materials/ceramic/' + entry);
    await import('oyn/adapters/motion');
    await assert.rejects(import('react'), /ERR_MODULE_NOT_FOUND|Cannot find package/);
    await assert.rejects(import('oyn/react'), /Cannot find package 'react'/);
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: temporary,
    encoding: "utf8",
  });
  await writeFile(
    path.join(temporary, "consumer.mts"),
    `
    import { createEngine, createSurface, type Material } from "oyn";
    import { ceramic, type CeramicProps } from "oyn/materials/ceramic";
    const definition: Material<CeramicProps> = ceramic;
    const surface = createSurface(createEngine(), { material: definition, props: { elevation: 8 } });
    surface.update({ elevation: -3 });
    surface.bind(document.createElement("button"))?.();
  `,
  );
  execFileSync(
    process.execPath,
    [
      path.resolve("node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--module",
      "nodenext",
      "--target",
      "es2022",
      "consumer.mts",
    ],
    { cwd: temporary, encoding: "utf8" },
  );
  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  assert.equal("packages/surface" in lock.packages, false);
  assert.equal("packages/ceramic" in lock.packages, false);
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  for (const item of registry.items) {
    const deps = item.dependencies ?? [];
    assert.equal(deps.filter((d) => /^oyn(?:@|$)/.test(d)).length <= 1, true);
    assert.equal(
      deps.some((d) => /^@oyn\/(surface|ceramic)(?:@|$)/.test(d)),
      false,
    );
  }
  console.log(
    "PASS: packed Core, material and motion entry points work without React; one runtime dependency in registry items.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
