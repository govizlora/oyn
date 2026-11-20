# Oyn

Experimental GPU surfaces with native DOM layout and interaction.

## Ceramic homepage and shader architecture

`npm run dev` serves the atelier at **http://127.0.0.1:5177**. The homepage is a
nine-family tactile control board: 22 controls using ten offline-baked profiles,
shared Ceramic lighting, and native HTML interaction. Existing cards remain exact
analytic geometry; inset wells retain their existing treatment.

**Start with [the current architecture and next-chat handoff](HANDOFF.md)** for the
implemented boundaries, source map, one-run 500-card benchmark, known limits and
plan to make the approach canonical across shaders. That wider migration is not
yet complete. Original Ceramic defaults remain unchanged.

Quiet (`?study=1`) remains available, along with
the object library and archived compositions. `npm run build` outputs root `dist/`.
`npm run test:sculpted` checks the homepage; `npm test` runs `test:atelier` for
Card, Quiet and archive behavior. See [Atelier notes](examples/atelier/README.md) for routes.

The shadcn migration remains separate: `dev:shadcn` (:5176) / `build:shadcn`.
MUI remains available separately (`dev:mui`, :5174).

## Surface + Appearance API

```tsx
const ref = useSurface({
  appearance: ceramic,
  props: { elevation: pressed ? 4 : 16, maxElevation: 16 },
});
return <button ref={ref}>Confirm</button>;
```

Mount under `SurfaceProvider`. `ceramic` is a stable definition; props update a
persistent per-node appearance after commit. No manual memoization is required.
Surface manages DOM/canvas, WebGPU, resources, scheduling and optional shared input
facts. Ceramic interprets pointer state as light and owns hold/return/fixed policy.
See [API decisions](docs/surface-api.md) and [Surface contracts](packages/surface/README.md).
React Compiler validation remains future work, not a current compatibility claim.

## Object library — 53 objects + 2 compositions

`/?view=library&room=hardware` opens the new tactile objects. Ten rooms contain
55 entries. The text-heavy Daily objects and
Everyday desktop compositions are **preserved intact** in the final Archive room
(`/?view=library&room=archive`): calendars, tasks, tables, dropdowns and CRT code.

Star objects to keep a browser-local shortlist; **Picked** collects them and
**Export selection** downloads named source references for recomposition. Each
entry has an isolated URL. Up to six entries mount per page. Local explorations,
not a published package, OS controls, real messages or backend operations.

`npm run test:library` tests all entries, persistence/export, actual shader changes,
keyboard interaction and responsive layouts. See [the collection notes](examples/atelier/src/library/README.md).

## Support policy

Surface prefers WebGPU. If it cannot acquire a device it lazily loads WebGL2 for analytic rounded Ceramic cards (raised, inset and card geometry). Every rendered element still owns its DOM canvas; only the temporary batch buffer is shared. Baked, sculpted and WGSL-only materials retain native CSS on fallback devices.

`SurfaceProvider` reports initialization failures, device loss, invalid shaders and oversized canvases through `onError` (default: `console.error`) and disposes its rendering. Unsupported environments do not receive a substitute material effect.

The current packages use one canvas per bound DOM element, with one GPUDevice, pipeline cache and scheduler per Provider. See [Surface](packages/surface/README.md) and [Ceramic](packages/ceramic/README.md) for the current API and limitations.

## Packages

- `packages/surface`: `@oyn/surface` — SurfaceProvider, useSurface, DOM integration and WebGPU rendering; one canvas per element and one device/scheduler per Provider.
- `packages/ui`: reusable React controls such as `@oyn/ui/tabs`. Try the [Tabs workbench](http://127.0.0.1:5177/?view=tabs) in Atelier.
- `packages/ceramic`: `@oyn/ceramic` — composable shader fragments; explicit light/dark optical modes.

## Dashboard comparison — separate migration example

`npm run dev:shadcn` opens the official
shadcn/ui dashboard-01 comparison at http://127.0.0.1:5176.

One comparison app, two component implementations: **Original / Ceramic**.
Untouched upstream sources live in `examples/shadcn/original/`; our components
live in `examples/shadcn/src/ceramic/`. The app registry selects Button, Card,
Dialog and Tabs; other components remain Original. Switching mode remounts the
demo contents and resets local UI state, while preserving the outer scroll container. Theme and appearance preferences persist.
App-only dashboard adaptations, including Add Section, live in `src/app/`.

`npm run build:shadcn` produces the dashboard in `examples/shadcn/dist/`.

See [dashboard provenance and changes](examples/shadcn/README.md).
Tests against the running dashboard:
`npm run test:shadcn`, `npm run test:theme`.

See [HANDOFF.md](HANDOFF.md) for the current shader architecture and continuation plan. Still Creek is read-only.
