# oyn

DOM-native WebGPU materials in one package. Core and Ceramic work without React;
only `oyn/react` requires the optional React 19 peer. Version `0.0.0` is a local
workspace build, not a public npm release.

| Import                  | Use                                                                       |
| ----------------------- | ------------------------------------------------------------------------- |
| `oyn`                   | Core contracts, `createEngine`, `createSurface`, `createParameters`       |
| `oyn/react`             | `OynProvider`, `useMaterial`                                              |
| `oyn/materials/ceramic` | `ceramic`, `createCeramicMaterial`, types and defaults                    |
| `oyn/adapters/motion`   | `bindMotion`, a numeric subscription adapter with no animation dependency |

## React

```tsx
import { OynProvider, useMaterial } from "oyn/react";
import { ceramic } from "oyn/materials/ceramic";

function Key({ selected }: { selected: boolean }) {
  const ref = useMaterial({
    material: ceramic,
    props: { elevation: selected ? -3.2 : 8, maxElevation: 8 },
  });
  return (
    <button ref={ref} className="key" type="button" aria-pressed={selected}>
      Key
    </button>
  );
}

export function Example() {
  return (
    <OynProvider>
      <Key selected={false} />
    </OynProvider>
  );
}
```

`material` is a stable factory; its type determines the accepted `props`.
`useMaterial` returns a ref and forwards committed configuration to Core.
Ordinary updates reuse the host's instance and canvas; changing the factory or
host replaces the instance. Do not create material definitions during render.
Prefer one provider per document. It owns the engine, not theme or animation.

Keep semantics, native props, focus and state in HTML or your UI SDK. Compose refs
onto the same DOM host, with only one material binding. Hosts must accept children;
use an explicit container for void/replaced elements. OYN does not wrap or reparent
DOM. CSS owns dimensions, radius, clipping and stacking.

### CSS fallback

```css
.key {
  background: #eee;
  box-shadow: 0 2px 6px #0002;
}
.key[data-oyn-active] {
  background: transparent;
  box-shadow: none;
}
```

Core alone writes `data-oyn-active`. Suppress competing background/shadow paint
while it exists, including state-specific decorations, but retain text, focus
indicators and layout. Missing or failed WebGPU removes the marker and stops the
engine. There is no WebGL fallback, automatic retry or error callback prop.

## Without React

```ts
import { createEngine, createSurface } from "oyn";
import { ceramic } from "oyn/materials/ceramic";

export function mount(element: HTMLElement) {
  const engine = createEngine();
  const surface = createSurface(engine, {
    material: ceramic,
    props: { elevation: 8, maxElevation: 24 },
  });
  const unbind = surface.bind(element);
  engine.start();
  surface.update({ elevation: 16, maxElevation: 24 });
  return () => {
    unbind?.();
    engine.stop();
  };
}
```

This is the same lifecycle as React, not another adapter. A Surface handle can
bind several distinct hosts; each gets its own instance. Share the engine across
surfaces rather than allocating one per element.

## Ceramic controls

| Input          | Meaning                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `elevation`    | Instantaneous signed relief: positive raised, zero flat, negative recessed; default 16               |
| `maxElevation` | Nonnegative exterior-space budget, not a clamp or animation target; omission reserves initial height |
| `color`        | Opaque HEX/numeric `rgb()`, `transparent`, or `inverse` for the opposite default pigment             |
| `colorScheme`  | Optional `light` / `dark` environment override; otherwise inherited CSS then browser preference      |
| `lighting`     | Optional `soft` / `glossy` override; independent of environment                                      |
| `light`        | Pointer/fixed source, viewport position, and independent leave/blur/hidden policies                  |

Reserve animation overshoot with `maxElevation`; elevation changes alone do not
grow the budget. Updating `maxElevation` recalculates bounds, but cannot shrink
below the initial reserved height. Raised elevation and the explicit maximum must
stay below `shadowLightHeight`. Values must fit finite f32 numbers.

`light` defaults to pointer, fallback position `(100, 100)`, and `hold` on leave,
blur and hidden. `return` jumps immediately to the fallback; it is not animation.
`source: "fixed"` fixes the main lamp, not the independent pointer backlight.

The full typed option reference is [CeramicOptions](src/materials/ceramic/finish.ts);
[ceramicDefaults](src/materials/ceramic/defaults.ts) exposes the preset. Numeric
setters and props use the same instance, but choose only one writer per parameter.
For external animation, use `bindMotion(source, instance.setElevation)` inside a
consumer material definition and unsubscribe on disposal. The consumer owns
curves, interruption and reduced motion; Ceramic only receives current numbers.

`OynProvider` also accepts `hdr` (default false) and a stable `inputs` object.
Supplied `SurfaceInputs` replace default browser listeners; the caller owns their
lifetime. Changing `hdr` or input identity restarts engine resources, so do not
recreate input sources during render.

For custom materials, animation integration, rendering ABI and limitations, read
the [architecture contract](https://github.com/govizlora/oyn/blob/main/ARCHITECTURE.md).
