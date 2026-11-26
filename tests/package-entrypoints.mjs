import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const temporary = await mkdtemp(path.join(tmpdir(), "oyn-package-"));
try {
  function pack(directory) {
    const [packed] = JSON.parse(
      execFileSync(
        "npm",
        ["pack", directory, "--json", "--pack-destination", temporary],
        { encoding: "utf8" },
      ),
    );
    return "file:" + path.join(temporary, packed.filename);
  }
  const core = pack("./packages/core");
  const materials = pack("./packages/materials");
  const adapter = pack("./packages/react");
  const react = pack("./node_modules/react");

  // Resolve unpublished workspace versions to the exact tarballs being tested.
  async function install(dependencies) {
    await writeFile(
      path.join(temporary, "package.json"),
      JSON.stringify({
        private: true,
        dependencies,
        overrides: { "@oyn/core": core, "@oyn/materials": materials },
      }),
    );
    execFileSync(
      "npm",
      ["install", "--offline", "--ignore-scripts", "--no-audit"],
      { cwd: temporary, encoding: "utf8" },
    );
  }
  await install({ "@oyn/materials": materials });
  const script = `
    import assert from 'node:assert/strict';
    const core = await import('@oyn/core');
    assert.equal(typeof core.createSurface, 'function');
    assert.equal(typeof core.createEngine, 'function');
    assert.equal('useMaterial' in core, false);
    assert.equal('OynProvider' in core, false);
    assert.equal('materialAppearance' in core, false);
    const { particle } = await import('@oyn/materials');
    const grains = particle.create({ time: 3 });
    assert.equal(grains.parameters.get(3), 3);
    assert.throws(() => grains.update({ exit: 2 }));
    assert.equal(grains.parameters.get(3), 3);
    grains.update({ exit: 1 });
    assert.equal(grains.parameters.get(4), 1);
    const { ceramic } = await import('@oyn/materials');
    const instance = ceramic.create({ elevation: 8 });
    assert.equal(instance.parameters.get(1), 8);
    instance.update({ elevation: -3 });
    assert.equal(instance.parameters.get(1), -3);
    assert.equal('material' in instance, false);
    assert.equal("loadWebGL2" in instance, false);
    for (const entry of ['baked', 'card', 'flip-disc', 'sculpted'])
      await assert.rejects(import('@oyn/materials/ceramic/' + entry), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    assert.equal(typeof core.bindMotion, 'function');
    await assert.rejects(import('react'), /ERR_MODULE_NOT_FOUND|Cannot find package/);
    await assert.rejects(import('@oyn/react'), { code: 'ERR_MODULE_NOT_FOUND' });
  `;
  execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: temporary,
    encoding: "utf8",
  });
  await writeFile(
    path.join(temporary, "consumer.mts"),
    `
    import { createEngine, createSurface, type Material } from "@oyn/core";
    import { ceramic, type CeramicProps } from "@oyn/materials";
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
  assert.equal(
    Object.keys(lock.packages).some(
      (p) =>
        p.startsWith("examples/") ||
        p === "packages/ui" ||
        /naga-wasm|shadcn|@base-ui/.test(p) ||
        (p.includes("node_modules/@ui-sdk/") && !lock.packages[p].dev),
    ),
    false,
  );
  await rm(path.join(temporary, "node_modules"), { recursive: true });
  await rm(path.join(temporary, "package-lock.json"));
  await install({ react, "@oyn/react": adapter });
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from "node:assert/strict";
    import * as entry from "@oyn/react";
    import * as materials from "@oyn/materials";
    assert.equal(typeof entry.useMaterial, "function");
    assert.equal(typeof entry.OynProvider, "function");
    for (const [key, value] of Object.entries(materials))
      assert.equal(entry[key], value, key);
  `,
    ],
    { cwd: temporary },
  );
  console.log(
    "PASS: packed materials work without React; installing the React adapter brings in Core and every material.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
