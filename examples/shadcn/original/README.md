# Immutable upstream snapshot

Files under `registry/` are extracted verbatim from the official shadcn/ui
new-york-v4 responses saved in `registries/`. `manifest.json` maps each file to
its registry response and SHA-256 checksum. The snapshot includes dashboard-01,
its declared local dependencies, and the other primitives already present in
this example. Upstream MIT license: `../UPSTREAM-LICENSE.md`.

Do not edit these files to integrate or restyle the app. Local business/layout
adaptations belong in `../src/app/`; material implementations belong in
`../src/ceramic/`. Import resolution is configured outside this directory.

Run `node tests/shadcn-registry.mjs` from the repository root to verify integrity.
A deliberate upstream update must replace the saved response, extracted source
and manifest together and be reviewed as an upstream update.
