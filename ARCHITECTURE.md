# OYN architecture contract

This is the **authoritative specification for module and package boundaries**. Read it before changing APIs, interaction, animation, materials or rendering. If the implementation diverges, reconcile the code, tests and documentation together.

- [UI usage and delivery](packages/ui/README.md): component sources, SDK composition and registry.
- [OYN API](packages/oyn/README.md) and [source map](packages/oyn/ARCHITECTURE.md): interfaces and reading order.
- [Ceramic optics](packages/oyn/src/materials/ceramic/README.md): color, lighting, shadows, padding and geometry.

## Package and entry points

`oyn` is the single runtime distribution. Its Core (`packages/oyn/src/core`) and
built-in materials (`packages/oyn/src/materials`) do not depend on React.
`oyn/react` provides `OynProvider` and `useMaterial`; `oyn/materials/ceramic`
provides Ceramic. Surface remains the internal DOM-binding concept, not a package.
The optional UI recipes remain in `packages/ui`. Only mechanical API references are migrated in
Not ready families; this does not promote or redesign them.

## 1. Identify the output and assign one owner

“Single source of control” means **only one path writes a given output**. It does not mean putting everything in one package or using only one `requestAnimationFrame` across the project. Clocks with distinct jobs can coexist; two mechanisms controlling the same height, position, shadow, selection or canvas cannot.

| Output or decision | Owner | Boundary |
| --- | --- | --- |
| Clicks, selection, forms, keyboard activation, ARIA and focus | Native HTML or the component's UI SDK or Base UI | OYN must not reimplement selection, synthesize clicks, steal focus or block SDK events. |
| DOM structure, hit areas, size, radius, clipping and stacking | Component or application DOM and CSS | Leave cursor choice to the browser; do not override native cursors. Elevation does not change z-index; Surface does not lay out elements or take over scrolling. |
| Target heights for rest, hover, press and selection | UI consumer | Ceramic does not recognize buttons or tabs, or infer selection from a negative height. |
| Animation curves, targets, position, velocity, interruption and reduced motion | Consumer's numeric source; CSS or the SDK can own DOM movement | Surface and Ceramic do not provide a second spring, transition or gesture animation policy. |
| Connection from a numeric source to a material setter | `bindMotion(source, write)` | The adapter subscribes, forwards and unsubscribes; it does not interpolate, schedule animation or submit GPU work. |
| Instantaneous values to geometry, optics, shadows and padding budgets | Ceramic | Do not add easing, change the caller's curve or redraw the same material shadow in CSS. |
| Shared pointer position, window focus and page visibility | Surface inputs; optionally a consumer-supplied source | Inputs do not define a default light or interpret a button press. |
| Pointer facts to light position (hold, return or fixed); environment to color and lighting | Ceramic | Surface does not read the theme or CSS radius, or infer material lighting. |
| Binding, canvas, measurement, GPU resources, batching invalidations and submitting draws | Core Surface + shared engine/renderer | The consumer does not create a second material canvas, GPUDevice or submission loop. |
| Non-GPU fallback, text, data markers and focus outlines | Component CSS | Only Surface writes `data-oyn-active`; the fallback must not paint over active GPU output. |
| Geometry compilation and generated shader mirrors | Offline tools | Do not rebake during interaction or edit `src/generated/` by hand. |

The **consumer** is the component or app calling Surface, including its custom material definition. Putting code in `MaterialInstance.bind` does not make it Ceramic's responsibility. Gesture handling and animation bindings belong in `packages/ui` or the app; `packages/oyn/src/materials/ceramic` contains only the material.

## 2. One write path, two ways to supply a value

Choose one per parameter.

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

`elevation` is the value **now**, not a target for the material to ease toward. The example updates immediately, reusing the instance and canvas. For animation, the consumer computes intermediate values; do not add an `animate`, `transition` or MotionValue prop to Surface or Ceramic.

### External animation source

```tsx
import type { Material } from "oyn";
import { useMaterial } from "oyn/react";
import { bindMotion, type MotionNumber } from "oyn/adapters/motion";
import { ceramic } from "oyn/materials/ceramic";

// The caller owns the source and its motion policy; each host owns its instance.
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

A `MotionNumber` provides `get(): number` and `on("change", listener): cleanup`. Surface has **no built-in Motion dependency and no material prop that automatically accepts a MotionValue**. External libraries and consumer-owned runtimes can both use the existing `bindMotion` adapter.

The component library creates the numeric source at node binding time and cleans it up via AbortSignal. See [ceramic-control.ts](packages/ui/src/ceramic-control.ts) and [control-motion.ts](packages/ui/src/control-motion.ts). This stops node-owned animation on failure, unbind, StrictMode replay and provider shutdown. The caller owns the lifetime of an external shared source; an individual surface must not destroy it.

```text
SDK / native state ──→ UI target + animation source
                              │ instantaneous number
                              ▼
                         bindMotion
                              │ sole writer
                              ▼
                   Ceramic material.setElevation
                              │ parameter notification
                              ▼
              Core engine coalesces invalidations → GPU draw
```

Do not write the same elevation from both declarative props and a subscription, or add an effect that writes the final value alongside the subscription. Do not represent a press by changing material height and scaling the hit area at the same time. `maxElevation` reserves shadow space; it is not a clamp, animation target or speed limit. The caller must allow room for any overshoot.

A provider may receive a stable `inputs: SurfaceInputs` source in place of its default browser listeners. This is replacement, not merging: the consumer owns that source and its lifecycle, while material bindings only subscribe. App-specific virtual pointer animation belongs in this source, never in Surface or Ceramic. A decorative marker and material lighting read the same snapshot; do not dispatch synthetic DOM interaction events.

## 3. Distinguish three kinds of frame

1. **Consumer animation:** compute the instantaneous number and notify subscribers, without touching the GPU.
2. **CSS or SDK animation:** move existing DOM (thumb, indicator) or expand layout (accordion). The SDK supplies state or target geometry and CSS interpolates. Do not add JS interpolation for the same property.
3. **Surface draw:** batch parameter and layout changes, read the binding's frame extras, upload and submit. Each provider has one draw scheduler. `bindMotion` does not move the consumer's clock into it.

Use `MaterialInstance.bind().frame()` to derive material inputs such as local coordinates from the current frame, not to hide a spring, a click handler or press timing inside a material. `requestDraw()` requests a redraw; it does not advance an animation. A consumer may emit a continuous stream of numbers, not start another render loop.

OYN control transitions use **Instant push** (quadratic ease-out): progress is `1 − (1 − t)²`, fastest at the start and stationary at the end. On each new target, button height moves from the current position to the target in 150 ms regardless of distance. Reversing changes direction immediately. DOM state transitions use the equivalent `--oyn-ease-out` curve. Looping indicators and wave propagation are not target-state transitions.

Each animation owner responds to reduced motion: the numeric source emits the final value immediately; CSS uses duration tokens governed by the media query. Reduced motion does not change selection, propagation order or input semantics. A preference change must not require a remount.

## 4. Lifecycle and composition

- `useMaterial` forwards to Core after commit; Core creates the material instance. Ref binding defines the lifecycle; ordinary prop updates do not rebind.
- **One surface binding per DOM host in a provider.** Duplicate binding is an error, not last-writer-wins. Typically there is one provider per document; nested or independent providers should not bind the same host.
- When composing Trigger → Button → Avatar, the outer component declares the material and inner components forward props and refs. This also applies to props received by a `render` callback. A native-element adapter must not hide them inside an inner `render` and cause the wrapper to create a second material. Examples and registry items follow the same rule.
- Void elements such as `<input>` cannot contain a canvas. The field container owns one well; the native input keeps its ref, caret and label. A custom `render` does not guarantee a material. Use the actual `FieldWell` container boundary rather than guessing from the component type.
- Empty `MaterialInstance.passes` means there is nothing to draw. Surface releases the presentation and target but keeps the binding and subscriptions. Derive outline presence from the existing animated value: no canvas at rest, and release it after exit. Do not add visible/enabled state. A parameter notification or `requestDraw` wakes the same resource path.
- Native activation and visual press feedback are distinct. Visual listeners do not trigger actions. Blur, cancellation, dragging out and back in, capture, disabled and pending states must clear or restore transient feedback correctly. Selection remains with the SDK.
- React bridges committed configuration and lifecycle only. Do not call setState every frame or write to a running instance during render.
- Release node-owned subscriptions, observers and animations on abort/dispose. Unsubscribe from an external source without destroying it for its caller.
- If Surface initialization or execution fails, stop that engine, remove `data-oyn-active`, release the presentation and report the error. **There is no `onError` prop, `enabled` prop or automatic retry.** Manage binding with ref detachment and reattachment; an update does not revive a failed engine.

## 5. Component cross-sections and code map

| Behavior | State or geometry source | Visual path |
| --- | --- | --- |
| Button, Toggle and navigation press | SDK/native state; `ceramic-control.ts` reads transient input | `control-motion.ts` → bindMotion → elevation. Selection changes only the rest height; Button variants choose hover and press heights through the same path; only Primary adds a native CSS fill; Ceramic remains unpigmented for all three. |
| Switch, Tabs and Segmented Control | SDK checked/selected state; SDK indicator bounds where supplied | CSS translates the indicator over 250 ms with the shared Instant push curve; its SDK-measured dimensions do not interpolate. One persistent TabsPanels surface draws the background. SDK presence attributes crossfade only the incoming and outgoing panel contents in the same grid cell with the same selection timing and easing as the indicator. Tabs and Segmented Control share the recessed track, sliding indicator and −4 hover relief. Base UI RadioGroup has no group indicator geometry; its adapter measures the checked radio, without managing selection or keys. Only unselected items recess on hover; the indicator stays raised while moving and at rest. Tracks, indicators and tab panels use the environment’s default Ceramic finish. Hover relief leaves the track pigment visible and eases from 0 to −4 and back with the same 150 ms motion source as Button; a flat item draws no surface. Selection removes its hover relief immediately. Tab panels use the default raised elevation. |
| Accordion | SDK open state, panel height and presence | CSS animates height and rotation; no duplicate expansion state or measurement. |
| Input and compound fields | Native input and SDK group | One FieldWell frame; do not repaint the contents. |
| Dialog and popups | SDK portal, focus and presence; CSS stacking | Ceramic height expresses optical depth; CSS does not simulate a cross-element 3D scene. |
| Ripple exploration | `ripple-field.ts` propagates waves; `stone-material.ts` owns gestures and animation | Consumer numeric channels → bindMotion → `createFlipDiscMaterial`. The material never reads a clock. |

The active scope comprises the families in the [Atelier catalog](examples/atelier/src/components/catalog.json) and the standalone Card. Routine iteration is limited to the [Ready list](packages/ui/ready.json). Unlisted families and their stories are Not ready but remain available for preview and testing.

Dependencies point from UI/app to OYN's public entry points. Inside OYN, React depends on Core Surface; Surface and the renderer depend on the Material protocol, never on concrete materials. Ceramic depends only on public contracts and standalone parameter utilities, not on Surface, the engine, React or UI SDKs. The Core root entry never imports or re-exports React or concrete materials. Type-only imports obey the same direction.

`Material<P>` is a stable factory; `MaterialInstance<P>` is the actual drawing object and owns optional `update(props)` and `dispose()`. There is no Appearance wrapper or nested instance.material. The optional `SurfaceBinding.material` remains a target-local view for a deliberately shared imperative source; it is not a second configuration lifecycle. Core `createSurface(engine, { material, props })` owns creation, updates, registration and disposal for every bound host. `useMaterial` only bridges refs and committed props to that same path. Instance updates report `layout` when binding, parameter identity or bounds change, and `draw` for non-notifying visual changes. Parameter writes already notify the shared draw scheduler.

The engine owns browser resources, including HDR preference subscriptions. Stopping it releases those resources and aborts target bindings; restarting can reuse still-bound instances. Host unbinding releases the instance. A fatal failure additionally disposes all registered Core surfaces and cannot restart.

## 6. Verification, limits and change criteria

`npm run test:package` packs and extracts the runtime into an isolated directory, then verifies Core/material imports and TypeScript consumption without React. `npm run test:material-core` checks the framework-independent host lifecycle, including multiple hosts and failure cleanup.

`npm run check:architecture` checks layer dependencies, prohibits interaction and animation scheduling in materials, and compiles this document's examples and negative API type tests. `npm run test:ui-control` covers numeric sources, continuous reversal, reduced motion, input boundaries and composition. `npm run test:ui` checks the shipped registry, Tabs and the catalog. `npm run test:flip-disc` covers WebGPU/WebGL2, wave propagation, presses, keyboard input and parameter updates. Run all browser tests headlessly.

### Optical continuity across zero elevation

Standard analytic Ceramic uses **one shader, a fixed parameter layout and one surface pass** for signed elevation. The setter writes only height. Raised and recessed branches compute optics for the current value without switching programs, blending two canvases, adding transition progress or caching the previous frame. The consumer still owns the animation curve.

**Height changes relief, not pigment coverage.** Colored Ceramic retains the same base color above, at and below zero; at zero it is flat paint. Controls without a fill use transparent Ceramic; native CSS can supply a button background. The rim, recessed wall, highlight, cast shadow and ambient occlusion (AO) disappear at zero. The material's own shadow falls outside the silhouette, never through a transparent face. Raised rim width and AO reach shrink with height, while the glaze-normal sampling profile stays fixed in CSS space so a sharp highlight does not sweep across pixel centers. Highlight brightness saturates before multiplication by geometric coverage.

Recessed analytic geometry has one tangent normal profile: a small circular opening fillet joins the top plane to the concave wall, which eases into the floor. Its narrow highlight comes from that profile, not a separate border or pass. Spatial radiance sampling filters the lip; the existing relief coverage removes it at zero. Glossy recesses reuse the material reflection strength and sharpness controls.

Frosted backlighting illuminates the ground outside the silhouette only when the pointer is over the actual surface. Distance inside the silhouette continuously controls how much light enters; ground brightness falls off with distance from the virtual backlight. Instantaneous positive height sets brightness and spread; zero and negative heights emit none. Backlighting does not write the base color or introduce independent hover state, animation or CSS blur.

`npm run test:ceramic-elevation` checks the numeric contract and browser pixels: light, dark, contrasting and colored backgrounds; frame-by-frame sweeps through zero in both directions; zero and segment joins; shrinking AO; and canvas, pipeline and buffer reuse. Frames and measurements are in `test-results/ceramic-continuity/after/`. `test:ceramic-compatibility` checks calibrated raised finishes at common heights; `test:ceramic-shadow` checks shadow integration and composition. Explicit card and baked geometry come from the caller or asset. Changing shadow height does not turn them into recesses; the signed analytic guarantee does not extend to them.

Before changing behavior, ask: **What is the output? Who writes it, triggers updates and cleans it up? Has the old path been removed?** Afterward, verify idle scheduling (none), fast reversal, drag-out/cancel, disabled/pending, keyboard operation, light and dark themes, narrow screens, live reduced-motion changes, unbind/remount and readability without a GPU. A successful build is not visual acceptance.

Known limits: no arbitrary 3D scene or true cross-element shadows; elevation does not change DOM occlusion. Targets are axis-aligned. There is no general per-frame transform tracking, viewport culling or per-target dirty redraw. Signed analytic Ceramic has cross-zero pixel regressions, but is a visual approximation rather than a physical light-transport solver. Numeric continuity, optical continuity and DOM motion continuity require separate verification. React Compiler compatibility has not been certified. This contract is not proof that the whole project is optimal: new requirements need concrete use cases and evidence.
