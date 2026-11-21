# Oyn

Experimental GPU surfaces with native DOM layout and interaction.

Start with [the architecture contract](ARCHITECTURE.md): the one current source for
package boundaries, animation ownership, lifecycle and supported usage.
[Oyn UI vision](VISION.md) describes product/distribution;
[OYN Ceramic 设计哲学](docs/ceramic-design.md) describes spatial design.

## Component library

The [Atelier component library](http://127.0.0.1:5177/components.html)
contains 55 UI SDK React families with interactive Ceramic previews. Run
`npm run dev` to browse them. See [Oyn UI](packages/ui/README.md) for
package imports and source installation.

## Ceramic homepage and shader architecture

`npm run dev` serves the atelier at **http://127.0.0.1:5177**. The homepage is a
nine-family tactile control board: 22 controls using ten offline-baked profiles,
shared Ceramic lighting, and native HTML interaction. Existing cards remain exact
analytic geometry; inset wells retain their existing treatment.

[HANDOFF.md](HANDOFF.md) preserves historical shader research and benchmark evidence,
not current API instructions. Its older migration plans do not override the
architecture contract or package READMEs.

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
Surface manages DOM/canvas, WebGPU, resources, GPU draw scheduling and optional shared input
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

`SurfaceProvider` stops its engine on terminal initialization/runtime failures, restores CSS by removing `data-oyn-active`, and logs the error. There is no `onError` prop or automatic retry. Native CSS remains the fallback.

The current packages use one canvas per drawable DOM target, with one GPUDevice, pipeline cache and GPU draw scheduler per Provider. Empty draw programs keep their binding without a canvas. See [Surface](packages/surface/README.md) and [Ceramic](packages/ceramic/README.md) for the current API and limitations.

## Packages

- `packages/surface`: `@oyn/surface` — SurfaceProvider, useSurface, DOM integration and WebGPU rendering; one canvas per drawable target and one device/GPU draw scheduler per Provider.
- `packages/ui`: source-distributed React controls. Compare [Base UI Tabs](http://127.0.0.1:5177/?view=tabs&impl=base-ui) and [UI SDK Tabs](http://127.0.0.1:5177/?view=tabs) in Atelier. [Source installation and usage](packages/ui/README.md).
- `packages/ceramic`: `@oyn/ceramic` — geometry and optics; independent environment, pigment and soft/glossy lighting policies.

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for current boundaries. Still Creek is read-only.
