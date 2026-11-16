# Ceramic studies

Three desktop-first, full-viewport homepage explorations. Light only, no marketing
copy: tactile ceramic, quiet geometry and restrained hardware-inspired color.
The splash is for a desktop's **first screen**, not a phone mockup or dashboard.

## Open

```sh
npm run dev                 # http://127.0.0.1:5177
npm run build               # root dist/, static hosting; no deployment
npm run test:atelier        # production, headless Chrome, including the archive
npm run test:library        # full collection and selection workflow
```

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
updates wake Surface's sole scheduler. Five pipelines maximum after visiting both
optical materials (three Ceramic passes + optical + phosphor).

This does not add partial redraw, viewport culling, arbitrary DOM rotation or a
mobile GPU performance guarantee. WebGPU/HTTPS or localhost remains required;
unsupported environments show an explicit error, not a CSS/Canvas2D/WebGL fallback.

## Validation

`test:atelier` builds production and runs the shared-clock policy unit test, new
homepage interactions, and the preserved archive regression suite. Both browser
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
