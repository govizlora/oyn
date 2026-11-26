# @oyn/react

React bindings and standard OYN materials. In a React 19 app, install `@oyn/react`. For plain DOM, use `@oyn/core` and `@oyn/materials`. Version `0.0.0` is a local workspace build.

## React

```tsx
import { OynProvider, ceramic, useMaterial } from "@oyn/react";

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

### Applying Ceramic to an existing control

Ceramic is a general-purpose material for any UI surface, interactive or static.
Use it for a whole surface, such as a panel, or for one visible part, such as a
slider thumb. The host must be suitable for a material binding as described below.

Read the control's **light-mode appearance** as a relief profile. Choose elevation
per visible part, not per component name. This is a design convention for the
consumer, not a rule Ceramic infers from CSS or events.

| Visual cue in the native design | Ceramic interpretation |
| --- | --- |
| A part reads darker than its surroundings, like a slider groove, a darkened checkbox well or a text input field | Recess it: use negative elevation. |
| A white face needs a border to distinguish it from the surrounding white surface, like a slider thumb | Raise it: use positive elevation. |
| A clear button has no visible face at rest, then gains a darker fill on hover or press | Start flat with transparent pigment; recess on hover and deepen the recess on press. |

Focus lifts; pressure lowers. These are **directions**, not fixed signs: a focused
input can be less recessed and still below zero. A pressed raised button can sink
toward zero or below it. Choose one elevation for the current combination of
states: pressing a focused control lowers it relative to its focused resting
height. Ceramic does not draw a focus ring. Leave the browser or UI SDK in
charge of visible keyboard focus; do not suppress its indicator or substitute relief.

For example, a switch can have a recessed track and a raised Ceramic thumb.
Bind the thumb's material ref to the SDK's exposed thumb node, composing refs if
needed. Leave focus, keyboard handling, form behavior and checked state on the
switch root. Let the SDK position the thumb from its checked state; use the
root's exposed focus/press state to lift or lower the thumb. Checked is not
pressed: toggling on need not leave the thumb sunken after release.

Bind only to a node that can host a canvas. For a native input, use an explicit
visual container without moving the input's semantics onto it. If an SDK exposes
no suitable host or slot, don't query private markup or recreate its behavior to
attach a material. Verify keyboard operation, visible focus and the native CSS
appearance without WebGPU.

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
import { createEngine, createSurface } from "@oyn/core";
import { ceramic } from "@oyn/materials";

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

The full typed option reference is [CeramicOptions](https://github.com/govizlora/oyn/blob/main/packages/materials/src/ceramic/finish.ts);
[ceramicDefaults](https://github.com/govizlora/oyn/blob/main/packages/materials/src/ceramic/defaults.ts) exposes the preset. Numeric
setters and props use the same instance, but choose only one writer per parameter.
For external animation, use `bindMotion(source, instance.setElevation)` inside a
consumer material definition and unsubscribe on disposal. The consumer owns
curves, interruption and reduced motion; Ceramic only receives current numbers.

`OynProvider` also accepts `hdr` (default false) and a stable `inputs` object.
Supplied `SurfaceInputs` replace default browser listeners; the caller owns their
lifetime. Changing `hdr` or input identity restarts engine resources, so do not
recreate input sources during render.

For module boundaries and runtime ownership, see the
[architecture contract](https://github.com/govizlora/oyn/blob/main/README.md#architecture).

### External animation

Bind the source when the instance is created, reconnect when the source changes,
and unsubscribe when the host is released.

```tsx
import type { Material } from "@oyn/core";
import { useMaterial } from "@oyn/react";
import { bindMotion, type MotionNumber } from "@oyn/core";
import { ceramic } from "@oyn/materials";

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

## Particle

Use `@oyn/materials` for loading skeletons. Bind it to a placeholder
that accepts children. Its measured box and uniform CSS corner radius bias the
grain distribution; they do not clip it. Leave overflow visible for the long
exit trajectories. Keep loading semantics and the CSS fallback on the consumer
side (hide the fallback fill only while `data-oyn-active` is present).

```ts
import { createEngine, createSurface } from "@oyn/core";
import { particle } from "@oyn/materials";

export function placeholder(engine: ReturnType<typeof createEngine>, host: HTMLElement) {
  const color = "#a2adcf";
  const surface = createSurface(engine, { material: particle, props: { color } });
  const unbind = surface.bind(host);
  return {
    frame(time: number, exit: number) { surface.update({ color, time, exit }); },
    dispose() { unbind?.(); },
  };
}
```

`color` is an opaque sRGB pigment (HEX or numeric rgb(), default #929bb8).
Choose it for the surrounding background; Particle does not switch themes.
`time` is instantaneous animation time in seconds (default 0); `exit` is
dispersion progress in [0, 1] (default 0). The consumer drives both, can hold
time still for reduced motion, and unbinds after dispersion. Particle uses the
shared pointer while the page is visible and focused. Movement displaces grain
centers without changing their radii; the wake settles as `time` advances. Particle releases
its subscription on unbind, and reserves 180 CSS pixels of padding per side.
