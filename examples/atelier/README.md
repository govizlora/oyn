# Oyn Atelier

The default first screen is **Sculpted Ceramic**: nine functional control families
exploring dished keys, thumb wheels, dimple pads, bridge switches, pivot rockers,
thumb latches, detent rails, saddle faders and pocket dials.

The homepage now uses **offline-baked profiles + the shared Ceramic shader**.
The ten profiles cover all 22 shaped controls. Sphere cuts and bevel normals are
computed by `tools/geometry/controls.mjs`, never by the browser. Dials rotate a
fixed baked profile; elevation is a rigid instance parameter; rockers select one
of two prebuilt profiles. Existing keyboard, switch, dial and fader semantics remain.

Cards, housings and inset wells continue to use their exact analytic adapters.
Raised cards and baked controls call the same `ceramic-surface.ts` entry point and
`lightCeramic` implementation; they do not share a needlessly universal GPU shader
or allocate sampled geometry for a simple rounded rectangle. Existing inset
Ceramic remains unchanged. CSS owns layout/ink, not a second optical renderer.

The old `sculptedCeramic` API remains deprecated for compatibility, but is not
imported by the homepage or any other Atelier route.

## Open

```sh
npm run dev                 # http://127.0.0.1:5177
npm run build               # root dist/, static hosting; no deployment
npm run test:atelier        # production, headless Chrome, including the archive
npm run test:library        # full collection and selection workflow
```

- `/`: **Sculpted Ceramic**. Responsive nine-object specimen board.
  Run `npm run test:sculpted` for production headless checks.
- `/?view=card-comparison`: in-place comparison of the original Ceramic card and
  the analytic geometry adapter. Click the comparison area, park the cursor and press 1/2.
  Shared 280×160 footprint, color, elevation, corner radius and original optical equations.
- `/?view=solids`: **Geometry Lab**, six primitive/boolean specimens with prebaked presets.
  Run `npm run test:solids` for production headless checks.
- `/?study=1`: **Quiet — Porcelain**. Finish swatches, circular pads, a large dial,
  radio segments, switches, slider and shortcut keys.
- `/?study=2`: **Air — Kinetic objects**. Swept ceramic rotor, speed dial, reverse,
  removable grille, three/five/seven-blade detents, luminous pilot and switches.
- `/?study=3`: **Play — Tactile playground**. Pocket rotor, eight independently
  latched lamps, graphical phosphor field, twelve keycaps, three vertical faders,
  reaction bubbles and colored checkbox pills. Each control changes something.
- `/?view=library&room=hardware`: the six new hardware objects, separately reusable.
- `/?view=library&room=archive`: the former **Daily objects** and **Everyday desktop**
  compositions, preserved intact with their calendars, to-do list, searchable
  table, dropdowns, tags and CRT code. Text-heavy work has moved here, not been deleted.

The bottom pictograms switch studies; the **last** opens the component library.
One URL owner supports direct links and back/forward. Preview state intentionally
resets when changing studies/rooms; only starred object IDs persist.

## Geometry Lab (experimental)

The general runtime CSG experiment has been replaced with **offline-baked geometry**.
Run `npm run bake:geometry` deliberately after editing the internal shape recipes.
Normal builds consume checked-in assets; they never run the compiler in the browser.
The controls select baked presets rather than recomputing boolean cuts.

See [the current architecture and next-chat handoff](../../HANDOFF.md) for
ownership, asset formats, measured performance, limitations and migration plans.
That document supersedes the separate runtime-CSG audit and geometry notes.

- `@oyn/ceramic/baked`: immutable geometry data, one shared baked adapter.
- `@oyn/ceramic/card`: compact analytic card adapter; no CSG machinery.
- `finish.ts`: sole optical configuration normalization.
- `effects/ceramic-lighting.ts`: shared original Ceramic optical response.
- `effects/shadow.ts`: shared light integration; each geometry supplies coverage.
- Existing Surface renderer: static GPU data ownership and reference counting.
- Surface engine: sole scheduler/canvas lifecycle; lazy shared input facts.
- Ceramic appearance binding: interprets pointer state as light and reads CSS radius.

`npm run test:ceramic-compatibility` compares original and explicit card adapters
against the frozen pre-extraction shader for surface lighting only. Eight
light/dark/radius/elevation/light scenarios produce zero changed surface RGBA bytes;
full current-production and explicit-card outputs are compared separately because
the four-layer/contact shadow changes are intentional. Never regenerate the reference
to make a test pass. The A/B page uses the same footprint and light position.

`npm run test:baked` verifies deterministic compilation, equivalent-tree identity,
resource sharing/cleanup and 100 instances. It is not a promise that hundreds of
unique assets have the same memory cost as repeated instances.

The homepage uses the same baked adapter as the lab, with exact analytic rounded
silhouette shadows for those rounded control bodies. Its profiles are not changed
by live input; only rigid pose changes. See [the single 500-card benchmark](../../HANDOFF.md#6-validation-and-the-single-500-card-benchmark).
The checkpoint before this exploration is `557ac86`.

## Object library

56 entries: **54 interactive object specimens plus 2 preserved compositions**, in
10 rooms. Up to six entries mount per page; archived compositions span the full
width. Inspect individually, star a shortlist, export named source references,
and recombine later. This is an app-local exploration library, not a public package.
See [the library notes](src/library/README.md) for the inventory and boundaries.

## Interaction and boundaries

Native HTML retains focus, accessibility, form and keyboard semantics. Dials drag
vertically and support arrows/Home/End. Faders, switches, detents and pills are native
range/radio/checkbox inputs. Buttons lower their Ceramic elevation on press.
The pocket keyboard accepts physical letter/arrow keys while focused; Enter/Space
remain native activation of the focused key. It never installs global shortcuts.

Lamp levels change actual shader light output. Bubble elevation has a fixed
material budget, so its fader updates the existing material rather than rebinding it. The play keyboard toggles the first
lamp; vertical faders control rotor speed, lamp intensity and bubble elevation.
Reaction keys shift a two-bubble local queue; clicking a bubble changes its glyph.
Fan power controls all share one state. Zero speed also stops motion.

All data and effects are local demonstrations. No OS settings, physical fans,
networking, real messages, file transfers, audio, microphone, backend or accounts
are involved. Dates/files/status meters in the archive are samples, not live data.

## Rendering ownership

- `controls.tsx`: sole Ceramic configuration and basic Surface/Key/Dial/Fader/Switch.
- `playful-controls.tsx`: shared rotor housing, detent, lamps, keyboard, bubbles/pills.
- `kinetic-studies.tsx`: composes Air and Play using those same primitives.
- `everyday.tsx`: shared Calendar, Check, native Menu/SelectMenu, Files and ChoiceChips.
- `desktop.tsx`: untouched original compositions, re-exported by `library/archive.tsx`.
- `instrument-material.tsx`: one app-local optical shader/pipeline for rotor blades
  and luminous lenses. The rotor rotates **inside WGSL**, not by rotating a bound
  DOM surface. Housings, knobs, buttons and wells remain Ceramic.
- `phosphor.tsx`: one additional shader/pipeline for graphical fields and editable
  CRT glyphs. Text uniforms and semantic HTML come from one string.
- `motion-clock.ts`: one shared 30 Hz numeric time source, with no GPU submission.
  It exists only while a powered, nonzero-speed rotor subscribes; it stops on
  unmount, hidden document or reduced-motion preference. Fans start off. Resuming
  never simulates hidden time. There is no per-widget timer or renderer.

One SurfaceProvider owns one GPU device, its pipeline cache and the existing draw
scheduler. Every raised/recessed element is HTML bound to Ceramic; CSS lays out
geometry and prints flat marks, never another bevel/shadow approximation. Numeric
updates wake Surface's sole scheduler. The current homepage uses five pipelines (raised Ceramic, inset Ceramic and the
baked adapter). Visiting other studies can cache additional instrument/phosphor
programs; five is not a provider-wide maximum across every route.

This does not add partial redraw, viewport culling, arbitrary DOM rotation or a
mobile GPU performance guarantee. WebGPU/HTTPS or localhost remains required;
unsupported environments show an explicit error, not a CSS/Canvas2D/WebGL fallback.

## Validation

`test:sculpted` covers the current baked homepage. `test:atelier` builds production
and runs the shared-clock policy unit test, preserved study interactions, and the
archive regression suite. Both browser
suites run headless, with their own preview on :5191; `BASE_URL` can use an existing
server. Tests include actual changed pixels, mouse/keyboard input, single device,
cached pipelines, zero Canvas2D copies, idle rendering, motion cleanup, hidden and
reduced-motion policy, history, unsupported state and five viewport sizes:
1440×1000, 1440×900, 1280×720, 900×600, 390×844 (DPR 2). Desktop studies fit one screen;
small screens reflow. Archive tests retain calendar/search/sort/filter/dropdown and
mixed-selection coverage. Outputs: `test-results/atelier/` and `atelier-archive/`.

The library suite covers all 56 entries, persisted picks/export, isolated links,
search/paging, denied storage, and 30 room/viewport screenshots. Outputs:
`test-results/library/`. All screenshots are ignored by git.

Chrome is the rendered review target. Stock installed headless Firefox blocklists
WebGPU here; it is **not a rendered pass**. The shadcn migration, MUI comparison,
core material defaults and historical benchmark are unchanged. Nothing is pushed
or publicly deployed by these commands.

### Shadow research

`/?view=shadow-lab` compares uniform six-, five-, four-, and three-height shadows.
Each uses equal weights 1/N and heights H * [1/12 + (i + 1/2)/N], i=0..N-1.
The mean height stays 7H/12 across counts. Four layers are production; six layers retain the historical reference
arithmetic, and three layers retain the previous paired-average positions. Other sampling
experiments have been removed from this page and its shader assembly.

Each group displays five sizes/elevations: large sheet, portrait, round token, small
note and paper strip. All use Surface's global pointer light, unchanged surface optics
and shared contact darkening. Controls adjust height, radius, light height/size,
shadow strength, contact, surface light/highlight, color, and shadows-only rendering.
Same-position A/B supports keys 1 and 2 after focus. Preview boundaries and a 240 px
per-card drawing margin may crop extreme shadows. Work counts are not GPU timings.

`npm run test:shadow-lab` checks all 20 specimens, global light, interaction and mobile
layout headlessly. `node tests/shadow-height-comparison.mjs` verifies equal spacing,
weights, counts and mean heights, then renders all four counts at identical positions
with contact on/off and near/far/soft lights. Reports/screenshots: `test-results/`.

### Declarative appearance migration

Homepage housings/wells use `useSurface({ appearance: ceramic, props })`; sculpted
controls use `appearance: baked` with geometry/elevation/rotation props. Instances
and numeric parameter blocks persist through ordinary state changes. Specialized
instrument/phosphor/research programs use the explicit `materialAppearance` adapter
through the same lifecycle. No `useSurface({material})` overload remains. Optical
math, including four uniform shadow layers and contact composition, is unchanged.

## Minimal Surface / DOM Example

Open [surface.html](http://127.0.0.1:5177/surface.html) after `npm run dev`.
The production build also includes `surface.html`.

- `src/surface-button.tsx`: the entire native button example, using only React, Surface, and Ceramic.
- `src/surface-example.tsx`: ordinary HTML controls for exercising DOM changes.
- `src/surface-example.css`: isolated layout, without the Atelier component styles.
- `src/surface-dom-controls.ts`: native input delegation; mutates only test-owned host styles, classes, and visibility, never React state or Surface services.

Use window and nested scrolling, viewport and native container resizing, width/height sliders, radius classes, native details expansion, hidden ancestors, enable/disable, mount/unmount, replacement, theme, and CSS motion. Browser zoom / display changes exercise DPR; pointer leave / focus / visibility changes exercise input policy. There are no extra observers, synchronization listeners, or rendering loops in the example.

### Investigation Guide

| Scenario | Surface path to inspect | Caveat |
| --- | --- | --- |
| Button click / ordinary rerender | `useSurface` commit and update effects | Numeric updates should retain the canvas |
| Enable, mount, replacement | `useSurface` lifecycle effect and ref cleanup | Disable preserves native button state; replacement does not |
| Window / container / slider resize | Engine `ResizeObserver`, window resize | These signals can overlap; this page does not prove both are required |
| Native radius class, hidden ancestor, details | Engine attribute observer, binding measurement | No React state updates; details moves the button without resizing it |
| CSS-only radius / space above | CSS `:has(:checked)` | No attribute mutation or React update; can expose missing computed-style or position invalidation |
| Page / nested scroll | Engine capture-phase scroll listener | Native placement alone does not prove cached coordinates are fresh |
| CSS transition / animation | Engine end-event listeners | Continuous transform tracking is not guaranteed |
| Browser zoom / display change | Engine resolution media query | Inspect physical canvas dimensions, not only CSS bounds |
| Pointer / focus / visibility | Shared input subscription, Ceramic policy | Default Ceramic holds the last light position |
| Theme | Provider mode, instance update | Does not require a new native button |

Use breakpoints or temporarily disable one existing path at a time when investigating necessity. Keep the example free of helper measurement loops: they could hide the very synchronization failures being studied. There is no promise that all DOM changes are supported (for example, arbitrary rotation, perspective, or unobserved stylesheet changes).

### Isolating React from DOM / CSS Changes

Native width, height, class, visibility, and motion controls are uncontrolled inputs with one native delegated handler. Changes are delayed by one second by default, allowing pointer activity to stop before the mutation. React never supplies dynamic values for the mutated host fields; lifecycle controls remain separate. The native handler does not observe layout or request Surface work.

The CSS-only controls have no change handler. Their checked properties drive `:has(:checked)` rules for the button radius or the height of the preceding spacer. The spacer case moves the button without changing its own size. Scroll anchoring is disabled on the test container so the browser does not compensate for this shift.

For strict observation, focus a control using the keyboard, park the pointer over the sample, then toggle with Space (or adjust a slider using arrow keys). Keep the pointer still before and after the change. Moving it afterward is a separate recovery check, not proof of automatic synchronization. No live DOM status panel is added, since its mutations could themselves wake the engine.

These are diagnostic scenarios, not guaranteed supported behavior. A dotted native outline changing while the material does not is evidence to investigate, not something the demo should repair.
