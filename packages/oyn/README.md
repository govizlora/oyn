# oyn

One package for the React-free Core and built-in materials, with an optional React 19 interface. Import runtime contracts from `oyn`, React APIs from `oyn/react`, and Ceramic from `oyn/materials/ceramic`. React is an optional peer dependency and is never loaded by the Core or material entry points.

DOM-bound WebGPU surfaces. If WebGPU is unavailable or initialization/execution fails, the engine stops and native CSS remains visible. There is no second graphics backend, shader transpiler, page overlay or runtime retry.

Read the [architecture contract](../../ARCHITECTURE.md) for ownership and animation rules.
See the [source map](./ARCHITECTURE.md) for reading order and dependency boundaries. Start with `src/react/useMaterial.ts`.

## Declarative API

```tsx
import { OynProvider, useMaterial } from 'oyn/react';
import { ceramic } from 'oyn/materials/ceramic';

function Button({ pressed }: { pressed: boolean }) {
  const ref = useMaterial({
    material: ceramic,
    props: { elevation: pressed ? 4 : 16, maxElevation: 16 },
  });
  return <button ref={ref}>Confirm</button>;
}
// <OynProvider><Button pressed={false} /></OynProvider>
```

`material` is a stable `Material<P>` definition. `props` is inferred from it;
unknown fields, missing required fields and wrong types are rejected. Consumers
compose native props and refs without adding another Surface binding.

Core creates one instance per bound host after commit. Ordinary props updates
call the same instance's `update`; they do not recreate the instance or canvas.
Changing the definition or host ends the old instance. StrictMode replay is
supported; suspended renders cannot publish uncommitted configuration.
`OynProvider` owns the shared engine, not theme or animation policy.

## Material authoring

```ts
import { createParameters, type Material } from "oyn";

const visual: Material<{ value: number }> = {
  create({ value }) {
    const parameters = createParameters([value, 0, 0, 0]);
    return {
      shader, // WGSL implementing the documented frame/parameter ABI
      parameters,
      passes: ["surface"],
      measurePadding: () => ({ x: 0, y: 0 }),
      update({ value }) { parameters.set(0, value); },
      dispose() { /* Release instance-owned non-GPU resources, if any. */ },
    };
  },
};
```

`MaterialInstance<P>` is both the live configuration object and drawing contract.
There is no Appearance wrapper or nested `.material`. `update` and `dispose` are
optional for static instances. Parameter writes notify the engine automatically;
return `draw` for other visual changes or `layout` when changing bounds, binding
hooks or parameter identity. Validate complete updates before mutating live state.

An instance may provide `bind(context)` for target-local subscriptions. Context
contains `element`, `signal`, `inputs`, `requestDraw()` and `requestMeasure()`.
The result may supply `measure()`, `frame(frameContext)` and `dispose()`. Bindings
end on replacement, ref detachment, unmount or engine resource shutdown. Use the
abort signal for subscriptions. Never create devices/canvases or submit GPU work
inside a material. Consumer animation sources still own curves and timing.

## Without React

```ts
import { createEngine, createSurface } from "oyn";
import { ceramic } from "oyn/materials/ceramic";

const engine = createEngine();
const surface = createSurface(engine, {
  material: ceramic,
  props: { elevation: 8, maxElevation: 24 },
});
const unbind = surface.bind(element);
engine.start();
surface.update({ elevation: 16, maxElevation: 24 });
// On teardown:
unbind?.();
engine.stop();
```

This is the same binding path used by `useMaterial`, not an independent adapter.
A handle can bind multiple hosts; each owns a separate instance. Shared external
numeric sources are not destroyed by an individual host. Bind them in a consumer
material definition and unsubscribe on disposal; see the canonical animation
example in [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Optional input facts — not a light model

`context.inputs.pointer` provides `getSnapshot()` and `subscribe(listener)`:

- `position`: last viewport CSS position, initially null;
- `inside`: whether the pointer is known to be in the page;
- `focused`: window focus state;
- `visible`: document visibility.

Listeners are lazy, shared per Provider and removed after the last subscription.
Surface never supplies a synthetic default light position and never resets pointer
coordinates on blur/leave. Material decides what those states mean and whether
they warrant redraw. No consumer means no pointer listeners or pointer-triggered
renders. The API is for imperative binding/frame callbacks, not hidden mutable
state reads during React render; React consumers need an explicit snapshot subscription.
`frameContext.toLocal(point)` performs axis-aligned viewport-to-canvas conversion.

Ceramic subscribes to this service and interprets it as light. Other materials can
ignore it, use it for hit testing, or choose different visual responses. CSS radius
interpretation also belongs to Ceramic's binding, not Surface presentation code.

## GPU and frame contract

Premultiplied RGBA; six procedural vertices via `vertex`; ordered fragment entry
names in `passes`. Group 0 binding 0 is 64 bytes / four vec4f fields (the original 48-byte prefix is unchanged):

1. canvas CSS width/height, material extension lanes 0/1;
2. element x/y/width/height in canvas coordinates;
3. material extension lane 2, raster scale x/y, optional material extension lane 3 (defaults to zero);
4. optional material extension lanes 4/5 and two reserved zeros.

`binding.frame()` returns three, four or six finite f32 values for extension lanes; omitted means
zeros. Surface does not interpret them. Ceramic uses them for local light XY,
CSS radius, receiver eligibility and the independent backlight position, preserving the existing shader ABI without core optical assumptions.
Binding 1 is the fixed-layout numeric parameter block. Binding 2 optionally holds
immutable read-only storage. The renderer shares storage by resource identity and
reference counts it; no second GPU cache owns lifetime. Pipeline keys include shader,
ordered passes and storage layout, not colors or individual asset identities.

Parameters have change versions. Only changed parameter blocks and frame data are
uploaded. Numeric changes notify the one GPU draw scheduler, never React or layout. Changing
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

Materials own exterior-space policy. MaterialInstance.measurePadding(width, height)
returns horizontal/vertical CSS-pixel padding; contained effects return zero.
Surface only sizes and positions the canvas from that result, without retaining
a visual budget. Padding policy changes return 'layout'; resize/DPR/style changes
remeasure. Unbinding disposes the instance; rebinding creates a new one.
Axis-aligned targets only; no general rotation/skew/perspective or animation tracking.

## React Compiler

Render-time writes to live instance/ref state and render-time mode resolution were
removed from the hook. Correctness does not depend on memoization. Compiler-enabled
consumer/library validation remains future work: no Compiler certification or
`use no memo` workaround is claimed. See the [architecture contract](../../ARCHITECTURE.md) and headless
`npm run test:browser` for current lifecycle/input/type coverage.

## Optional external animation adapter

`bindMotion(source, write)` remains an opt-in low-level adapter at
`oyn/adapters/motion`, with no Motion runtime dependency in core. One writer
owns each parameter. A consumer material definition connects the source to its
instance setter and owns subscription cleanup; do not also write the same
property from declarative props.
The consumer owns animation targets, interpolation, reduced-motion policy and
cancellation. Its animation clock emits numbers; it is not a second renderer.
Surface coalesces parameter notifications into GPU work and does not calculate
animation curves or require an animation-specific frame API.

## Focused resource verification

`npm test` runs fast build, type, lifecycle, numeric and package checks without a
browser. `npm run test:browser` explicitly runs the headless WebGPU/CSS fallback
and optical suite. Archived components, experiments and benchmarks are excluded.

An empty `material.passes` list means there is currently nothing to draw. Surface
releases its presentation/target and removes `data-oyn-active`, but preserves the
binding and parameter subscription. A parameter notification or requestDraw wakes
that same path when the material has passes again. No separate enabled/visibility
state or consumer-owned canvas lifecycle is needed.

A binding may expose a target-local `material`. Surface uses its parameters, passes,
shader, data and padding without invoking its bind hook recursively. This lets
materials isolate per-element state when a source material is shared.


### CSS fallback

Keep the native appearance as the default. Surface owns the presence-only
`data-oyn-active` attribute on each element while its GPU presentation is active.
Do not set this attribute yourself.

```css
.button { background: #eee; box-shadow: 0 2px 6px #0002; }
.button[data-oyn-active] { background: transparent; box-shadow: none; }
```

Override hover/disabled decorations as needed, but preserve focus indicators and
layout dimensions. Initialization or runtime failure removes the attribute from
every surface in that Provider and permanently stops its engine. New mounts and
prop updates do not retry. Ref detachment also removes the attribute. Errors are
logged for diagnostics; there is no application error callback to wire up.

### Application-owned inputs

`<OynProvider inputs={inputs}>` accepts a stable `SurfaceInputs` object
instead of installing Surface's default browser input listeners. Omit it for the
normal browser input source. The application owns the supplied source's behavior
and lifetime; bindings subscribe and unsubscribe normally. Changing its identity
restarts the engine, so do not construct it during every render. For example, the
[website study](../../site/pointer.ts) shares one position between its decorative
touch cursor and materials without dispatching synthetic pointer events.
