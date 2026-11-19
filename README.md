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
`npm run test:sculpted` checks the homepage; `test:atelier` covers Card, Quiet
and archive behavior. See [Atelier notes](examples/atelier/README.md) for routes.

The shadcn migration remains separate: `dev:shadcn` (:5176) / `build:shadcn`.
MUI and the historical benchmark are also retained.

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

## Historical WebGPU presentation experiment (2026-11-15)

The root A/B benchmark is retained for research; it is not the current package architecture. Historical measurements below are not current package performance guarantees.

```sh
npm install
npm run dev:benchmark
```

- **A — Instanced:** http://127.0.0.1:5173/?mode=shared
- **B — Direct per-card:** http://127.0.0.1:5173/?mode=individual

Both modes now use **WebGPU**, the same WGSL light/dark Ceramic material and the same frame scheduler. This isolates presentation architecture rather than conflating WebGL vs WebGPU with canvas count. The previous WebGL measurements are retained in `test-results/performance/results-baseline.json`; they are historical, not this implementation's benchmark.

| Per frame | A — Instanced | B — Direct per-card |
|---|---|---|
| GPUDevice / queue | 1 / 1 | 1 / 1 |
| Presentation canvases | 1 full-content canvas | N card-local WebGPU canvases |
| Render passes | 1 | N |
| Draw calls | 2 instanced draws, N instances each | 2 draws per card, firstInstance selects card data |
| queue.submit | 1 | 1 |
| Application-level image / texture copies | 0 | 0 |

One static storage buffer holds all card rectangles; one small uniform update holds viewport, light and material parameters. Two shared pipelines use the shadow/surface entry points of one shader module. Geometry is a bounded quad per card plus shadow padding, **not N fullscreen triangles**. No per-card device, shader compilation, animation loop, CPU wait for GPU completion, or 2D canvas copy is involved.

Fixed scene: three columns; **120 cards**; 300×180 CSS px; 32px gaps; radius 16; elevation 6; 80px shadow padding; **DPR 2**. `src/benchmark-config.ts` is the single fixed workload definition; old count/DPR URL parameters are ignored and there are no UI controls for them. All cards are redrawn, including offscreen cards. A draws all shadows then all surfaces. B composites independent card images in DOM order. Overlapping shadows therefore need not be pixel-identical; neither mode simulates physical inter-card shadows.

**Limit on this machine:** A needs a 2248×17216 texture, exceeding the adapter’s 16384 maximum dimension. A explicitly reports unsupported, and tests record that result rather than claiming a rendered pass. B is supported. No automatic DPR reduction, card reduction or architectural fallback is applied; visual tests skip only the unavailable A comparison.

The WGSL port covers **light and dark Ceramic** optics (including dark specular/Fresnel, distance falloff and frosted edges), not every production material feature. Select Light/Dark in the page or add `&theme=dark`; both modes share the same pipelines, and switching only updates uniforms. Defaults come from `createCeramicMaterial()` in the material package. A paused scene redraws once on a theme change. The two benchmark modes share one WGSL implementation. This standalone benchmark remains WebGPU-only. The original MUI/shadcn demos are native UI baselines, while the Surface demo uses the current packages. Full example UI revalidation was not part of the package migration.

Historical light-mode measurements and limitations: [performance report](test-results/webgpu/REPORT.md). Dark mode has functional and visual validation, but the complete performance matrix has not been rerun.

### Reproducible measurement

```sh
npm run build:benchmark
npx vite preview --host 127.0.0.1 --port 5178 --strictPort
# In another terminal:
npm run test:performance
```

The performance script now launches installed **headless Google Chrome** (historical reports used headed Chrome), one test page at a time, viewport 1440×900. It uses automatic lighting plus deterministic native scrolling, warms up for 5 seconds and records 12 seconds per case. By default it measures light mode; use `THEMES=dark` or `THEMES=light,dark` to select appearances. It tests the fixed 120-card / DPR-2 workload in A/B twice, reversing A/B order in the second round. `BASE_URL` can override the default production preview URL.

Raw per-frame data, machine GPU details, screenshots and summaries go to `test-results/webgpu/`. Actual API calls are instrumented: requestDevice, configure, render passes, draws/instance counts, queue submissions and copy calls. Invalid counts, unexpected browser errors and hidden documents fail the test. A’s explicit texture-size rejection is recorded separately as unsupported, never as a successful performance sample.

The reported fps is **rAF update throughput**, not a GPU timer or proof of presented display frames. CPU timings cover command encoding/submission and may hide asynchronous GPU/compositor costs. Memory figures are one RGBA image per canvas, not actual total GPU memory. No universal winner or low-end/mobile guarantee follows from one Mac.

### Correctness checks

```sh
npm run test:benchmark  # headed Chrome against dev server :5173
BROWSER=firefox npm run test:benchmark # same smoke matrix in Playwright Firefox
npm run test:lifecycle  # cancellation, loss, cleanup, pointer coordinates
npm run build:packages
npm run test:visual     # current package suite; starts its own server on :5189
```

Install the Firefox test browser once with `npx playwright install firefox`. Constant-only WGSL `mix()` arguments use explicit `f32` literals for Naga compatibility; both browsers run the same shader without browser-specific fallbacks.

Smoke checks cover both appearances and modes at fixed 120 cards / DPR 2, live theme changes without recreating device/pipelines, one device, real draw/instance/pass/submit/copy counts, paused scroll without redraw, and native DOM clicks. The current `test:visual` command runs the package regression suite, including light/dark screenshots. The old package-WebGL comparison has been retired; retained historical images are not current validation. Texture limits, compilation errors, device loss and validation errors are explicit; there is no silent fallback. Initialization and teardown share one lifecycle, including asynchronous cancellation.

Mouse-follow lighting remains the default. Choose automatic lighting and auto-scroll for repeatable load. `&paused=1` renders once and freezes; native scrolling does not repaint the GPU scene. The current test deliberately does not implement visibility culling or dirty-region updates.

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
The historical benchmark remains available through `dev:benchmark` and
`build:benchmark`. MUI remains a separate unchanged experiment (`dev:mui`, :5174).

See [dashboard provenance and changes](examples/shadcn/README.md).
Tests against the running dashboard:
`npm run test:shadcn`, `npm run test:theme`.

See [HANDOFF.md](HANDOFF.md) for the current shader architecture and continuation plan. Still Creek is read-only.
