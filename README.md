# OYN

A DOM-native material system: **one package, a React-free Core, composable materials,
and an optional React interface.** WIP; version `0.0.0` is a local workspace build,
not a public npm release.

OYN supplies material rendering, not a component catalog. HTML/CSS and the
consumer's UI SDK own structure, accessibility and interaction; materials turn
instantaneous values into optics. Core binds them to DOM hosts and shares one
WebGPU engine. If GPU rendering fails, native CSS remains visible.

## Read only what you need

- [Usage](packages/oyn/README.md): entry points, React and plain DOM integration,
  Ceramic props and CSS fallback. This guide also ships with the package.
- [Architecture](ARCHITECTURE.md): the single contract for ownership, dependencies,
  lifecycle, material authoring, Ceramic optics and agent-oriented composition.

`Surface` remains Core's host-binding concept, not another package or an appearance
layer. `OynProvider` and `useMaterial` are React interfaces to that same lifecycle.
There is no separate Appearance object, React-dependent Core or WebGL backend.

## Develop

```sh
npm install
npm test               # Build, architecture/types, numeric/lifecycle contracts, package isolation
npm run test:browser   # Explicit headless GPU, CSS fallback and optical regressions
```

`npm run build` builds only `packages/oyn` and checks the architecture contract.
`npm run dev` serves fixtures under `/tests/fixtures/`; it does not open a browser
or launch a component showcase. Browser tests are not part of the fast suite.

## Frozen local work

Only Core, the React interface and standard Ceramic are active. The Ready list
was empty at cleanup, so all UI components, examples, site/deployment files and
material experiments were archived with their dedicated tests.

- `archive/2026-11-25-lean-core/`: original work and a complete baseline snapshot.
- `archive/2026-11-25-docs-consolidation/`: previous docs, historical handoff and
  local design/brand studies, with a checksum manifest.

Archives are local, Git-ignored and excluded from builds, tests and formatting.
Do not update them or treat them as current guidance. A fresh clone has no local
archive; tracked pre-cleanup work is recoverable from commit `67c2f59`. Restore only
explicitly selected work, not the retired workspace or test suite.
