# @oyn/surface

React 19 DOM-bound WebGPU surfaces. One canvas per bound element; one GPU device,
pipeline cache and draw scheduler per Provider. WebGPU only: no Canvas2D/WebGL/CSS
fallback. Surface owns presentation and execution, not material optics.

See the [source map](./ARCHITECTURE.md) for reading order and dependency boundaries. Start with `src/react/useSurface.ts`.

## Declarative API

```tsx
import { SurfaceProvider, useSurface } from '@oyn/surface';
import { ceramic } from '@oyn/ceramic';

function Button({ pressed }: { pressed: boolean }) {
  const ref = useSurface({
    appearance: ceramic,
    props: { elevation: pressed ? 4 : 16, maxElevation: 16 },
  });
  return <button ref={ref}>Confirm</button>;
}
// <SurfaceProvider><Button pressed={false} /></SurfaceProvider>
```

`appearance` is a stable `Appearance<P>` definition. `props` is inferred from that
definition; unknown fields, missing required fields and wrong types are rejected.
`ceramic` is no longer a callable mutable-material factory. `useSurface({material})`
is removed. Ordinary React users need neither manual memoization nor instance setters.
The hook accepts only appearance and props. Consumers compose additional refs outside
the hook, preserving React 19 cleanup. Binding and unbinding the returned ref controls
the instance lifetime.

An appearance instance is created after commit for the bound node, not during render.
Normal props/theme updates call its `update`, preserving the instance and canvas.
Fresh props object identity alone does not imply a new instance. Appearance or target
replacement ends the old instance. StrictMode setup/cleanup replay is supported;
there is no promise of exactly-once effects. Async GPU initialization is cancellable.

`SurfaceProvider` owns the engine and `onError` (default console.error). Theme is application-owned: pass the resolved `colorScheme` through appearance props.

## Appearance authoring

```ts
import type { Appearance } from '@oyn/surface';
const visual: Appearance<MyProps> = {
  create(props) {
    return {
      material: /* low-level GPU draw description */ program,
      update(nextProps) {
        // Validate, compare, update owned parameters/resources.
        // Return 'layout' for changed visual bounds, 'draw' for visual-only changes,
        // or nothing if unchanged. Never mutate caller props.
      },
      dispose() { /* instance-owned non-GPU cleanup */ },
    };
  },
};
```

`Material` is the low-level draw description (shader, parameters, passes, padding measurement,
optional immutable data), not the React lifecycle API. `materialAppearance` is an
explicit `Appearance<{material: Material; colorScheme?: ColorScheme}>` for existing GPU programs and externally
controlled numeric sources. It uses exactly the same binding/engine path, not a
legacy hook overload. Such externally controlled sources must remain stable.

A program may provide `bind(context)` for per-target DOM subscriptions. Context has
`element`, `signal`, `inputs`, `requestDraw()` and `requestMeasure()`. It returns
optional `measure()`, `frame(frameContext)` and `dispose()` callbacks. Use the abort
signal for event cleanup. Bindings end on program binding replacement, ref detachment,
unmount or provider disposal. They must not create devices, submit GPU commands,
control canvas placement or introduce another rendering scheduler/resource owner.

## Optional input facts — not a light model

`context.inputs.pointer` provides `getSnapshot()` and `subscribe(listener)`:

- `position`: last viewport CSS position, initially null;
- `inside`: whether the pointer is known to be in the page;
- `focused`: window focus state;
- `visible`: document visibility.

Listeners are lazy, shared per Provider and removed after the last subscription.
Surface never supplies a synthetic default light position and never resets pointer
coordinates on blur/leave. Appearance decides what those states mean and whether
they warrant redraw. No consumer means no pointer listeners or pointer-triggered
renders. The API is for imperative binding/frame callbacks, not hidden mutable
state reads during React render; React consumers need an explicit snapshot subscription.
`frameContext.toLocal(point)` performs axis-aligned viewport-to-canvas conversion.

Ceramic subscribes to this service and interprets it as light. Other appearances can
ignore it, use it for hit testing, or choose different visual responses. CSS radius
interpretation also belongs to Ceramic's binding, not Surface presentation code.

## GPU and frame contract

Premultiplied RGBA; six procedural vertices via `vertex`; ordered fragment entry
names in `passes`. Group 0 binding 0 remains 48 bytes / three vec4f fields:

1. canvas CSS width/height, appearance extension lanes 0/1;
2. element x/y/width/height in canvas coordinates;
3. appearance extension lane 2, raster scale x/y, reserved zero.

`binding.frame()` returns three finite f32 values for extension lanes; omitted means
zeros. Surface does not interpret them. Ceramic uses them for local light XY and
its CSS radius, preserving the existing shader ABI without core optical assumptions.
Binding 1 is the fixed-layout numeric parameter block. Binding 2 optionally holds
immutable read-only storage. The renderer shares storage by resource identity and
reference counts it; no second GPU cache owns lifetime. Pipeline keys include shader,
ordered passes and storage layout, not colors or individual asset identities.

Parameters have change versions. Only changed parameter blocks and frame data are
uploaded. Numeric changes notify the one scheduler, never React or layout. Changing
bindings/data/layout may require specific GPU resources to be replaced; normal
numeric props updates do not recreate the instance/canvas/pipeline. Dirty frames
still draw all registered surfaces; per-target redraw and viewport culling are not
implemented. Idle submissions stop.

## DOM placement and visual bounds

Application owns layout, semantics, business events and removal of native background
paint. The current canvas layer is a child of its target: use a container for void
or replaced elements. Separate target/host support is a future extension, not an
implemented guarantee. No implicit wrapping or DOM reparenting.

The host-sized layer uses layout containment; padded ink does not enlarge ancestor
scroll areas. Native overflow and stacking still apply. There are no cross-element
shadows. Surface restores its own temporary positioning/isolation styles on cleanup.

Appearances own exterior-space policy. Material.measurePadding(width, height)
returns horizontal/vertical CSS-pixel padding; contained effects return zero.
Surface only sizes and positions the canvas from that result, without retaining
a visual budget. Padding policy changes return 'layout'; resize/DPR/style changes
remeasure. Unbinding disposes the instance; rebinding creates a new one.
Axis-aligned targets only; no general rotation/skew/perspective or animation tracking.

## React Compiler

Render-time writes to live instance/ref state and render-time mode resolution were
removed from the hook. Correctness does not depend on memoization. Compiler-enabled
consumer/library validation remains future work: no Compiler certification or
`use no memo` workaround is claimed. See `docs/surface-api.md` and headless
`test:surface-appearance` for current lifecycle/input/type coverage.

## Optional external animation adapter

`bindMotion(source, write)` remains an opt-in low-level adapter at
`@oyn/surface/adapters/motion`, with no Motion runtime dependency in core. One writer
owns each parameter. Use `materialAppearance` for such explicit externally driven
programs; do not simultaneously write the same property from declarative props.

## Focused Resource Tests

`npm run test:baked` checks geometry reproducibility, shared GPU storage and pipelines, idle scheduling, and resource release with three surfaces. It does not collect frame-rate samples. Run `BAKED_STRESS=1 npm run test:baked` explicitly for the 100-surface workload and frame-rate sampling; both modes use the same test implementation.
