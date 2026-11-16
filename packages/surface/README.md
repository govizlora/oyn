# @oyn/surface

React 19 DOM-bound WebGPU rendering. One canvas per element, one GPUDevice and one draw scheduler per Provider. No WebGL, Canvas2D copying, ancestor discovery, shared page canvas, or fallback.

```tsx
const material = useMemo(() => ceramic({ elevation: 12 }), []);
const ref = useSurface({ material });
return <button ref={ref}>Press</button>;
// Mount under <SurfaceProvider onError={handleError}>.
```

The application owns CSS layout, focus, events and removal of native background/border paint. A canvas is appended directly to the bound element (not suitable for void elements). The engine adds relative positioning when necessary and isolation, restoring its own styles on cleanup. Native overflow clips the canvas. DOM stacking applies to each entire surface, including its shadow; there is no cross-surface shadow coordination.

## Support policy

WebGPU is required, on HTTPS/localhost with an available GPU adapter/device. Environments without usable WebGPU are unsupported. No WebGL, Canvas2D or CSS fallback, native-style restoration, or compatibility renderer is planned. Failures are reported through `SurfaceProvider.onError`; see lifecycle behavior below.

## Numeric updates

Core accepts a Material, never a MotionValue or a number/source union. Material parameters are a fixed-layout f32 block created with `createParameters`. Its `set(index, number)` notifies the sole renderer scheduler; it does not update React, measure layout, recompile pipelines or resize canvases. A material may expose named numeric setters, such as Ceramic's `setElevation`.

Keep animated materials stable with `useMemo`/`useState`. Replacing a material intentionally replaces its parameter source; the old subscription is removed. One writer owns each animated parameter.

### Explicit Motion adapter

```tsx
import { bindMotion } from '@oyn/surface/adapters/motion';

const material = useMemo(() => ceramic({ elevation: 12, maxElevation: 18 }), []);
const elevation = useMotionValue(12); // from motion/react
useEffect(() => bindMotion(elevation, material.setElevation), [elevation, material]);
const ref = useSurface({ material });
// animate(elevation, 3, { type: 'spring', ... }) is entirely owned by Motion.
```

The adapter reads the current value, subscribes to changes and returns cleanup. It has no runtime dependency on Motion. Manual updates call the same numeric setter. Surface owns its single rAF scheduler; adapter notifications are coalesced. Depending on external rAF callback order, a notification may be presented on the next frame; no same-frame synchronization guarantee is claimed.

## Bounds and lifecycle

At DOM binding, capture `material.bounds.initial` once, before asynchronous GPU initialization. Budget is `max(capturedInitial, bounds.max ?? capturedInitial)`. A new material object does not reset it. Real unmount/rebinding creates a new lifetime. StrictMode effect replay does not reset a still-existing binding's budget.

Bounds are measured using element dimensions and that stable budget. Element resize, DPR changes, or explicit max-budget changes update the bitmap dimensions as needed. Numeric animation updates do not. Exceeding the budget does not clamp the animation or grow the canvas: effects can be clipped. An unavailable device, device loss, invalid shader or oversized canvas disposes the provider's rendering and calls `onError` (default: console.error). No implicit recovery or fallback.

## Modules

- `index.tsx`: React registration, forwarded-ref cleanup, binding lifetime.
- `engine.ts`: subscriptions, observers, one frame scheduler and lifecycle.
- `presentation.ts`: one element/canvas, local dimensions, bounds and pointer coordinates.
- `renderer.ts`: device, cached pipelines, per-target buffers and one submission per dirty frame.
- `material.ts`: fixed numeric parameter blocks and generic material contract.
- `adapters/motion.ts`: explicitly opt-in third-party bridge.

## WGSL material contract

Premultiplied RGBA; six procedural vertices via `vertex`; ordered fragment entry names in `passes`. Group 0 binding 0 is a 48-byte uniform block with three vec4f fields:

1. canvas CSS width/height, pointer x/y in canvas CSS coordinates;
2. element x/y/width/height in canvas CSS coordinates;
3. corner radius, raster scale x/y, reserved zero.

Binding 1 is the material's f32 block, padded explicitly to groups of four floats. Its length is fixed. Shader and pass entry points determine the pipeline cache key; colors and parameter values do not. Materials own optics and visual-bound calculations, not Surface.

## Current limits

Axis-aligned DOM rectangles and uniform numeric corner radius (top-left radius used for all corners). No arbitrary rotation/skew/perspective, independent elliptical corners, textures, render graph or cross-element shadows. Native clipping is intentional. Continuous CSS transform animations are not tracked every frame: pointer/scroll/layout invalidation refreshes the light's coordinate mapping. Dynamic uniforms do not perform DOM measurement. Dirty frames currently redraw all registered visible-size surfaces; viewport culling is not implemented. Global structural/style observation remains intentionally broad.


### Theme ownership

`SurfaceProvider` defaults to `mode="system"` and follows live OS color-scheme changes.
Pass `mode="light"` or `mode="dark"` once when an application already owns theme selection.
`useSurfaceMode()` exposes the resolved mode for controls that intentionally invert it.
Materials may implement `resolveMode(mode)`; `useSurface` resolves appearance without mutating
a source shared across providers. The low-level engine does not read browser theme:
non-React integrations resolve the material explicitly before registering it.
