# OYN architecture contract

This is the authoritative specification for module boundaries and runtime ownership.
Read it before changing APIs, interaction, animation, materials or rendering.

- [OYN API](packages/oyn/README.md) and [source map](packages/oyn/ARCHITECTURE.md)
- [Ceramic optics](packages/oyn/src/materials/ceramic/README.md)

## 1. Active scope and dependencies

`oyn` is the only active package. Core (`src/core`) and standard Ceramic
(`src/materials/ceramic`) do not depend on React. `oyn/react` is only a framework
interface. The Ready component list was empty when the UI library, examples,
site, registry and material experiments were frozen in a local ignored archive.
Archived work is not a dependency, test target or API reference. Restore it only
on an explicit request; never update it as part of routine iteration.

```text
React interface → Core Surface → Material protocol ← Ceramic
                        ↓                ↑
                   shared engine → WebGPU renderer
```

Core cannot import React, concrete materials, UI SDKs or animation libraries.
Built-in materials import Core contracts and the standalone parameter utility,
not Surface, the engine, renderer or a barrel that re-exports them. These rules
apply to type imports too. Internal modules import their actual dependencies.

`Material<P>` is a stable factory. `MaterialInstance<P>` is the actual drawing
object, with optional `update(props)` and `dispose()`. There is no Appearance
wrapper or nested `instance.material`. `SurfaceBinding.material` is only a
target-local drawing view for a deliberately shared imperative source; Surface
does not recursively bind it or give it a second configuration lifecycle.

## 2. One owner per output

| Output or decision | Owner |
| --- | --- |
| Activation, selection, forms, keyboard behavior, ARIA and focus | Native HTML or the consumer's UI SDK |
| DOM structure, size, radius, clipping, stacking, scrolling and cursor | Consumer DOM/CSS |
| State-to-visual targets, animation curves, interruption and reduced motion | Consumer |
| Numeric source subscription → material setter | `bindMotion(source, write)` |
| Instantaneous values → optics, relief, shadows and exterior bounds | Material |
| Shared pointer/window facts | Core inputs, or a consumer-supplied replacement |
| Input facts → light policy; environment → finish | Material |
| Host instance creation, updates and disposal | Core Surface |
| Canvas presentation, measurement, resources and GPU submissions | Shared Core engine/renderer |
| Text, focus rings and non-GPU fallback | Consumer CSS |

Two paths writing the same output are a design smell. Fix ownership at the source;
do not layer compensating effects. Distinct clocks can coexist, but the material
never samples time or implements a spring, transition or gesture. Surface batches
GPU work; it does not own the consumer's animation clock. Elevation affects optics,
not DOM stacking, hit areas or a cross-element 3D scene.

## 3. One parameter write path

Choose one writer per parameter.

### Instantaneous declarative values

```tsx
import { OynProvider, useMaterial } from "oyn/react";
import { ceramic } from "oyn/materials/ceramic";

function Key({ selected }: { selected: boolean }) {
  const ref = useMaterial({
    material: ceramic,
    props: { elevation: selected ? -3.2 : 8, maxElevation: 8 },
  });
  return <button ref={ref} type="button" aria-pressed={selected}>Key</button>;
}

export function Example() {
  return <OynProvider><Key selected={false} /></OynProvider>;
}
```

`elevation` is the value now, not a target to ease toward. Props changes reuse the
instance and canvas. Do not add `animate`, `transition` or MotionValue props to
Core or Ceramic. `maxElevation` reserves exterior space; it is not a clamp, target
or speed limit. The caller budgets any overshoot.

### External numeric source

```tsx
import type { Material } from "oyn";
import { useMaterial } from "oyn/react";
import { bindMotion, type MotionNumber } from "oyn/adapters/motion";
import { ceramic } from "oyn/materials/ceramic";

const animatedCeramic: Material<{ height: MotionNumber }> = {
  create({ height }) {
    const instance = ceramic.create({ elevation: height.get(), maxElevation: 24 });
    let source = height;
    let disconnect = bindMotion(source, instance.setElevation);
    return Object.assign(instance, {
      update({ height }: { height: MotionNumber }) {
        if (height === source) return;
        disconnect();
        source = height;
        disconnect = bindMotion(source, instance.setElevation);
      },
      dispose() { disconnect(); },
    });
  },
};

export function AnimatedKey({ height }: { height: MotionNumber }) {
  const ref = useMaterial({ material: animatedCeramic, props: { height } });
  return <button ref={ref} type="button">Animated key</button>;
}
```

`MotionNumber` exposes `get()` and `on("change", listener): cleanup`; no Motion
library is required. The consumer owns the source, reduced-motion policy and
interruption. A host unsubscribes but does not destroy an external shared source.
Do not also write elevation through props or an effect. Do not represent the same
press by both changing relief and scaling the hit area.

## 4. Binding, rendering and failure

- `createSurface(engine, { material, props })` is the one host lifecycle path.
  Handle creation is side-effect free. Binding creates one instance per host;
  updates reach every bound host; cleanup is idempotent. One engine cannot bind
  the same host twice. Prefer one engine/provider per document.
- `useMaterial` forwards refs and committed props to that path. It does not create
  or dispose instances itself. Suspended renders cannot publish configuration;
  StrictMode replay cleans up before rebinding. No per-frame React state writes.
- Consumers compose native props and refs transparently. Nested components must
  not create another material for the same host. Void/replaced elements need an
  explicit non-void container; Core does not wrap or reparent DOM.
- Parameter changes notify the shared scheduler. Return `layout` from an update
  when bounds, binding hooks or parameter identity change; return `draw` for
  other non-notifying visual changes. Validate before publishing an update.
- `bind(context)` may subscribe to environment/input facts using its abort signal.
  `frame()` derives instantaneous frame inputs, never animation timing. Binding
  cleanup owns target subscriptions; instance disposal owns instance resources.
- Empty passes release presentation/resources, not the host binding or its
  subscriptions. A parameter notification or redraw request wakes the same path;
  do not add a second enabled/visibility state. Idle submissions stop.
- Core has one WebGPU rendering path. Missing API/adapter, acquisition rejection,
  validation failure or device loss stops that engine and disposes its surfaces.
  It removes `data-oyn-active`, restoring native CSS. There is no second GPU
  backend, automatic retry, error callback prop or React fallback state.
- Only Core writes `data-oyn-active`. CSS fallback must stop painting the material
  while this marker exists; native text, layout and focus outlines remain.
- Engine resource stop aborts target subscriptions and releases GPU/browser
  resources. A non-failed restart can reuse still-bound instances. Host unbinding
  disposes the instance. A failed engine cannot restart; props cannot revive it.
- Supplied `SurfaceInputs` replace, never merge with, default browser listeners.
  The caller owns their lifetime. Do not dispatch synthetic interaction events to
  drive a material light or put pointer animation into Core.

## 5. Ceramic optical invariants

Standard Ceramic uses one shader, one fixed parameter layout and one surface pass
for signed elevation. Crossing zero never switches programs, adds another canvas,
blends old frames or runs material-owned interpolation.

Height changes relief, not pigment coverage. At zero, colored Ceramic is flat
paint and transparent Ceramic leaves the receiver unchanged. Rim, cast shadow,
AO and relief highlights disappear at zero. Shadows never darken the interior of
a transparent face. Raised rim/AO reach shrink with height while the glaze normal
sampling profile stays fixed in CSS space. Highlight radiance saturates before
multiplication by coverage, avoiding subpixel flashes.

Recesses have a tangent opening-fillet/wall/floor profile. Its highlight comes from
that geometry, not a second border or pass. Spatial sampling filters the lip.
Frosted backlighting is gated by the actual host and positive height; it changes
neither pigment nor independent hover state. Canvas bounds reserve shadow/glow
space from the configured height budget.

## 6. Verification and limits

- `npm test`: package build, architectural/type contracts, framework-independent
  lifecycle and failure cleanup, numeric Ceramic invariants, and packed imports
  plus TypeScript consumption without React. No browser or archived workspace.
- `npm run test:browser`: headless lifecycle/StrictMode/idle/resource checks,
  unavailable-GPU CSS fallback, environment policy, optical continuity at DPR 1/2,
  shadow convolution, reflection coverage and shadow composition. Run this when
  touching rendering, material optics or DOM lifecycle, not for unrelated prose.

Before a change, identify its output, writer, update trigger and cleanup owner.
Remove replaced paths. Check live updates, unbind/rebind, multiple hosts, failure
cleanup, light/dark environments and native CSS without GPU rendering.
A successful build alone is not visual acceptance.

Targets are axis-aligned: no general rotation/skew/perspective tracking. There is
no arbitrary 3D scene, cross-element shadowing, viewport culling or per-target
redraw. Optics are a visual approximation, not a physical transport solver.
React Compiler compatibility has not been certified. New requirements need
concrete use cases and evidence, not speculative adapters or compatibility paths.
