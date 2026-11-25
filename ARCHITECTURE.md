# OYN architecture

The single contract for runtime ownership, dependencies and material authoring.
Read this before changing APIs, interaction, animation, materials or rendering.
[Usage examples and public entry points](packages/oyn/README.md) live in the package
guide; historical documents under `archive/` are not current specifications.

## 1. One package, distinct responsibilities

OYN is a material system, not a component library. `packages/oyn` contains Core,
the React interface and standard Ceramic. These are module boundaries, not separate
installations. Core and material entry points never load React.

| Concept               | Responsibility                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ |
| Core                  | Framework-independent contracts, host lifecycle, inputs and shared rendering         |
| `Material<P>`         | Stable factory describing how to create a material from typed props                  |
| `MaterialInstance<P>` | Live drawing object: parameters, shader, passes, bounds and optional update/disposal |
| Surface               | Core's binding between a DOM host and its material instance                          |
| Engine / renderer     | Shared browser resources, measurement, draw scheduling and WebGPU execution          |
| React interface       | `OynProvider` and `useMaterial`; context, refs and committed configuration only      |
| Ceramic               | A concrete material implementing the same public protocol as other materials         |

Material belongs to the Core contract; Ceramic supplies its implementation.
Surface remains the upstream lifecycle owner, not a competing visual abstraction.
There is no Appearance layer, nested `instance.material`, separate material
package or React-owned instance lifecycle. The optional `SurfaceBinding.material`
is a target-local drawing view, not another configuration wrapper.

### Dependency direction

Arrows below mean allowed imports, not execution order:

```text
React interface ───────────────> Core runtime
Core Surface ──────────────────> Engine ──> WebGPU renderer
Core runtime ──────────────────> Core contracts / parameter utility
Concrete materials (Ceramic) ──> Core contracts / parameter utility
Consumer ──────────────────────> public entry points + its chosen UI SDK
```

Core cannot import React, concrete materials, UI SDKs or animation libraries.
React cannot import concrete materials or introduce UI/animation policy. Built-in
materials may import only Core types and `createParameters`, not Surface, Engine,
renderer or the public barrel. Internal modules import exact dependencies. These
rules include type imports and are enforced by `npm run check:architecture`.

### One writer per output

| Output / decision                                                          | Owner                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| Semantics, keyboard, forms, activation, ARIA and focus                     | Native HTML / consumer UI SDK                  |
| DOM structure, size, radius, clipping, stacking, scrolling and cursor      | Consumer DOM/CSS                               |
| State-to-visual mapping, animation curves, interruption and reduced motion | Consumer                                       |
| Numeric source subscription → setter                                       | `bindMotion(source, write)`                    |
| Current values → optics, bounds, environment/lighting policy               | Material                                       |
| Shared pointer/window facts                                                | Core inputs or a consumer-supplied replacement |
| Instance creation, configuration updates and disposal                      | Core Surface                                   |
| Canvas placement, measurement, resources and GPU submissions               | Core engine/renderer                           |
| Text, focus rings and non-GPU appearance                                   | Consumer CSS                                   |

Before adding a mechanism, identify its output, writer, trigger and cleanup owner.
Replace conflicting paths at the source. Do not compensate with another effect,
context, cache or state flag. Elevation changes optics, not DOM stacking or hit areas.

## 2. Host and resource lifecycle

```text
consumer config → Surface handle → bind(host) → Material.create(props)
                                              ↓
                         engine → instance.bind(context) → target drawing view
                                              ↓
                  measure → material bounds/frame inputs → WebGPU draw
```

- Creating an engine or Surface handle has no browser side effects. Binding creates
  one instance per host; updates reach every bound host. One engine cannot bind
  the same host twice. Unbinding disposes the instance exactly once.
- `useMaterial` forwards refs and committed props to this path. It never creates,
  updates or disposes instances directly. Suspended renders cannot publish live
  configuration; StrictMode replay cleans up before rebinding. No per-frame React
  state writes. Definition/engine changes replace the handle.
- Parameter notifications schedule GPU work, not React renders or layout. Ordinary
  elevation updates reuse the instance, canvas, pipeline and parameter buffer.
  Bounds, binding hooks or parameter-identity changes require layout invalidation.
- `bind(context)` owns target subscriptions. Its abort signal ends them on target
  release; binding `dispose()` releases any additional target resources. Instance
  `dispose()` owns instance-level cleanup at host unbind/replacement or fatal failure.
  A target-local drawing view is never recursively bound.
- Empty `passes` releases presentation/resources and removes `data-oyn-active`,
  but preserves the host binding and parameter subscription. A parameter change
  or redraw request wakes that same path; no separate enabled/visibility state.
- Engine stop releases target subscriptions, presentations, GPU resources and
  browser listeners. A normal resource restart can reuse bound instances.
  Missing API/adapter, acquisition rejection, validation failure or device loss
  stops the engine, disposes surfaces, logs the failure and restores native CSS.
  Failed engines cannot restart; new mounts and props do not retry.

Core has one WebGPU backend. No WebGL mirror, shader transpiler, automatic retry,
React fallback state or error callback prop. Only Core writes `data-oyn-active`;
consumer CSS paints the non-GPU appearance when that marker is absent.

The canvas is a child of its host, never a page overlay. Consumers explicitly
provide containers for void/replaced elements. Host-sized layout containment keeps
padded ink from enlarging scroll areas; native overflow and stacking still apply.
Core restores its temporary positioning/isolation styles on cleanup.

## 3. Material authoring contract

The executable type reference is
[`core/types/material.ts`](packages/oyn/src/core/types/material.ts).
A stable `Material<P>.create(props)` returns one `MaterialInstance<P>`:

| Member                          | Contract                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `shader`, `passes`              | WGSL source and ordered fragment entry names; empty passes means no drawing     |
| `parameters`                    | Fixed-layout numeric block from `createParameters`; writes notify the scheduler |
| `measurePadding(width, height)` | Horizontal/vertical exterior padding in CSS pixels; zero for contained effects  |
| `data?`                         | Immutable read-only storage payload; renderer owns its GPU copy                 |
| `update?(props)`                | Validate before publishing changes; return `layout`, `draw` or nothing          |
| `bind?(context)`                | Target-local subscriptions and optional measure/frame/dispose callbacks         |
| `dispose?()`                    | Instance-owned cleanup, not renderer-owned GPU resource management              |

Return `layout` when bounds, binding hooks or parameter identity change. Return
`draw` for other visual changes that do not already notify through parameters.
Do not create devices/canvases, submit GPU work or sample animation time in materials.

Binding context supplies `element`, `signal`, `inputs`, `requestDraw()` and
`requestMeasure()`. A binding's `frame()` derives instantaneous inputs, not time
integration. `frameContext.toLocal(point)` converts viewport CSS coordinates to
axis-aligned canvas coordinates. Pointer snapshots contain position (initially
null), inside-page, window-focus and document-visibility facts, not light policy.
Default listeners are lazy and shared; no subscribers means no pointer-triggered
work. Supplied `SurfaceInputs` replace rather than merge with default listeners.
Their caller owns lifetime. React reads require explicit snapshot subscriptions.

### Rendering ABI

Premultiplied RGBA; six procedural vertices from `vertex`; fragment entry points
execute in `passes` order. Group 0 contains:

| Binding      | Layout                                                   |
| ------------ | -------------------------------------------------------- |
| 0            | 64-byte frame block: four `vec4f` fields, detailed below |
| 1            | Fixed-layout material parameter block                    |
| 2 (optional) | Immutable read-only storage                              |

Frame fields are `(canvasWidth, canvasHeight, extra0, extra1)`,
`(elementX, elementY, elementWidth, elementHeight)`,
`(extra2, rasterScaleX, rasterScaleY, extra3)`, and `(extra4, extra5, 0, 0)`.
Dimensions are CSS pixels. `frame()` returns three, four or six finite f32 extension
values; omitted lanes are zero. Core does not interpret their optical meaning.
Ceramic uses them for local light XY, radius, receiver eligibility and backlight XY.

Parameter versions and frame comparison avoid unchanged uploads. GPU storage is
shared by resource identity and reference-counted in the renderer. Pipeline keys
include shader, ordered passes and storage layout, not color or asset identity.
Dirty frames draw all active targets; idle submissions stop. Use explicit f32
literals in constant-only WGSL built-ins (for example `1.5f`) for Naga compatibility.

### External animation: one parameter writer

Declarative numeric props are values **now**, not targets to ease toward. For an
external source, bind its values to a setter instead of also writing that parameter
through props. Under `OynProvider`:

```tsx
import type { Material } from "oyn";
import { useMaterial } from "oyn/react";
import { bindMotion, type MotionNumber } from "oyn/adapters/motion";
import { ceramic } from "oyn/materials/ceramic";

const animatedCeramic: Material<{ height: MotionNumber }> = {
  create({ height }) {
    const instance = ceramic.create({
      elevation: height.get(),
      maxElevation: 24,
    });
    let source = height;
    let disconnect = bindMotion(source, instance.setElevation);
    return Object.assign(instance, {
      update({ height }: { height: MotionNumber }) {
        if (height === source) return;
        disconnect();
        source = height;
        disconnect = bindMotion(source, instance.setElevation);
      },
      dispose() {
        disconnect();
      },
    });
  },
};

export function AnimatedKey({ height }: { height: MotionNumber }) {
  const ref = useMaterial({ material: animatedCeramic, props: { height } });
  return (
    <button ref={ref} type="button">
      Animated key
    </button>
  );
}
```

`MotionNumber` exposes `get()` and `on("change", listener): cleanup`; no Motion
library is required. The consumer owns the source, reduced-motion policy and
interruption. A host unsubscribes but does not destroy an external shared source.
Do not also write elevation through props or an effect. Do not represent the same
press by both changing relief and scaling the hit area.

## 4. Ceramic: one optical path

Ceramic uses one signed-elevation shader, one 28-float parameter layout and one
surface pass. Positive height is raised, zero is flat, negative is recessed.
Crossing zero never changes programs, adds a canvas, blends previous frames or
starts material-owned interpolation. `ceramic.create` and `createCeramicMaterial`
use the same factory. Props and `setElevation` update the same live drawing object.

### Resolution and bounds

Resolve configuration in this order, independently for each host:

1. **Environment:** explicit `colorScheme`, otherwise inherited CSS `color-scheme`,
   then browser preference when CSS is normal or permits both. Honor single allowed
   schemes, including `only light` / `only dark`. Without a browser, default to light.
2. **Pigment:** explicit color, otherwise light `#f0f0f0` / dark `#0c0c0c`.
   `inverse` swaps default pigment, not environment; `transparent` removes pigment
   and uses the environment's default color for automatic lighting selection.
3. **Lighting:** explicit `lighting`, otherwise compare linear-sRGB relative
   luminance against `#c0c0c0`: strictly above is soft, equal/below is glossy.
   Use decoded sRGB and Rec.709 weights, not encoded RGB averages.
4. **External shadows:** enabled only for positive height in a light environment.
   Dark disables cast/contact shadows regardless of numeric strength, without
   flattening geometry or changing the lighting model.

Environment bindings react to ancestor attributes, style-element edits, stylesheet
load, resize and browser preference. Direct CSSOM edits do not emit DOM mutations;
callers must request layout invalidation. No idle polling. Ceramic, not Core, reads
CSS radius and interprets pointer facts as light; fixed main lighting does not
freeze its independent pointer backlight. Shared imperative sources still resolve
separate target-local environments.

`maxElevation` budgets exterior ink, not a clamp or target. Omission reserves the
initial height, clamped to zero for recesses. Elevation writes never grow that
budget; changing the explicit maximum triggers layout and cannot shrink below the
initial reservation. Reserve overshoot before animating. Bounds use the same f32
shadow parameters as the shader, conservative Gaussian tails and the larger of
shadow/glow footprints. Excess relief can clip; the library never changes the curve.

### Optical invariants

- Height changes relief, not pigment coverage. At zero, colored Ceramic is flat
  paint; transparent Ceramic leaves the receiver unchanged. Rim, cast shadow, AO
  and relief highlights vanish. Shadow never darkens the transparent face interior.
- Raised rim and AO reach shrink with height, but the glaze-normal sampling profile
  stays fixed in CSS space. Saturate highlight radiance **before** multiplying by
  coverage, preventing subpixel strips from flashing into opaque highlights.
- Recesses use a tangent opening-fillet/wall/floor profile. The nominal 1.25 CSS-pixel
  fillet meets a 50-degree wall; shallow recesses reduce the fillet to reserve wall
  depth. Four spatial samples filter the lip, not a second border/pass or temporal
  smoothing. Pigment depth tint is bounded, not a physical transport simulation.
- Cast shadows convolve a rounded rectangle with a Gaussian area-light approximation:
  analytic straight bands, eight-point corner quadrature, and four height samples
  `(5, 11, 17, 23) / 24` with equal weights. AO reach is `0.35 * height`; the minimum
  Gaussian sigma is raster filtering, not minimum physical reach.
- Projected opacity `P` and contact opacity `A` combine as
  `(P + A * (1 - P)) * reliefCoverage`. Do not suppress AO using global cast strength
  when an edge may be unshadowed. Padding uses the matching kernel's tail bound.
- Glossy frost is reflected ground light, not face tint. It is gated spatially by
  the actual host and positive height; no hover state or timed fade. Flat/recessed
  surfaces produce none. Material preset values live in `defaults.json`, not a
  second documentation-maintained configuration table.

## 5. Agent-oriented composition

The intended AI-native unit is a **material contract plus native/UI-SDK behavior**,
not a closed list of prebuilt OYN components. An agent should be able to choose a
material, map semantic state to its typed inputs, attach one host binding and keep
native behavior intact. No Core fork or component-specific renderer is required.

Today this is supported by typed props, documented ownership and one lifecycle.
There is **not yet** a machine-readable material description/schema, discovery
registry, component generator or certification of arbitrary UI SDK compatibility.
Do not imply that importing OYN supplies those capabilities.

For any new material, document its purpose, inputs/units/defaults/ranges, environment
behavior, bounds budget, input facts, update triggers and cleanup requirements.
Keep executable types/defaults authoritative; any future agent metadata must derive
from or be checked against that contract, not become a second configuration system.
Generated components still need accessibility, ref-composition, fallback and
lifecycle verification with their chosen UI SDK.

## 6. Source map, verification and limits

All paths below are relative to `packages/oyn/src`:

| Read in order                                                                    | Purpose                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `core/types/material.ts`, `core/createParameters.ts`                             | Material protocol and notifying numeric storage                   |
| `core/surface.ts`                                                                | Host creation, update and disposal                                |
| `react/useMaterial.ts`, `react/OynProvider.tsx`                                  | Committed React bridge and engine scope                           |
| `core/engine.ts`, `core/presentation.ts`                                         | Shared scheduling, input/resources, placement and fallback marker |
| `core/renderer.ts`, `core/gpu/`                                                  | Sole WebGPU backend and resource ownership                        |
| `materials/ceramic/material.ts`, `finish.ts`                                     | Instance factory, validation and optical configuration            |
| `materials/ceramic/environment.ts`, `interaction.ts`                             | Host environment and input interpretation                         |
| `materials/ceramic/bounds.ts`, `optics.ts`, `shaders.ts`, `inset.ts`, `effects/` | Ink budget, shared constants and WGSL optics                      |

`npm test` builds packages, enforces import directions, compiles the actual usage
examples in these docs, and checks types, Core lifecycle, numeric optics and packed
imports without React. `npm run test:browser` adds headless StrictMode/idle/resource,
CSS fallback, environment, DPR 1/2 continuity, shadow and reflection regressions.
Run the browser suite for rendering, optics or DOM lifecycle changes, not prose.
A build is not visual acceptance: verify live updates, unbind/rebind, multiple hosts,
failure cleanup, both environments and native CSS without GPU rendering.

Only Core, the React bridge and standard Ceramic are active. Archived components,
experiments and historical docs remain frozen, outside builds and tests. Do not
restore them without an explicit request or introduce speculative compatibility paths.

Current limits: axis-aligned hosts only; no general rotation/skew/perspective
tracking, arbitrary 3D scene, cross-element shadows, viewport culling or per-target
redraw. Optics approximate appearance, not full light transport. React Compiler
compatibility is not certified.
