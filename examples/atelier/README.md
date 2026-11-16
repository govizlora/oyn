# Ceramic studies

Three desktop-first, full-viewport homepage explorations. Light only; no marketing
copy. The primary visual reference was a quiet white panel of tactile ceramic
controls, with Braun / Teenage Engineering-inspired order and restrained color.
The current iteration applies that material language to **everyday interfaces**,
not music hardware. Small functional labels and dates are part of the objects.

## Open

```sh
npm run dev                 # http://127.0.0.1:5177
npm run build               # root dist/, static hosting, no deployment
npm run test:atelier        # production, headless Google Chrome
```

- `/?study=1`: **Quiet — Porcelain**. Fine partitions, a brightness dial, finish
  swatches, round pads, window-arrangement radio segments, toggles and shortcuts.
- `/?study=2`: **Focus — Daily objects**. A quiet focus-duration dial and presets,
  a shared interactive calendar, a checkable daily list and a quiet-time switch.
- `/?study=3`: **Play — Everyday desktop**. Calendar, searchable file collection,
  physically raised selected table rows, grid view, multi-select filters, radio
  dropdowns, colored labels, display controls, keyboard shortcuts and a small
  amber phosphor code display.

The bottom pictograms switch studies and update the URL. Back/forward works.
Each study intentionally starts fresh when selected; no hidden persistence.

## Interaction

- Dials: drag vertically; native arrow keys, Home and End also work.
- Sliders, radio groups and switches retain native form and keyboard semantics.
- Calendar: previous/next month, day selection, arrows, Home/End and PageUp/PageDown.
  Month changes clamp the day, and a single day remains in the Tab order.
- Collection: search, sort by name/size/recency, independently filter file types,
  switch list/grid, and select individual files or all **visible** files. Selection
  persists across filtering and views; the select-all checkbox has a native mixed
  state. Filtering does not move the Labels panel below it.
- Dropdowns: native details/summary, ArrowDown to open and focus a choice, native
  radio/checkbox keys, Escape to dismiss and restore focus. Outside pointer and
  focus movement dismiss them. Multi-select filters stay open for further choices.
- Command/Ctrl+K and the tactile shortcut keys focus search. The Dock focuses
  actual controls; the previous-day key changes the calendar. The star key toggles
  a local favorite state. Colored labels are independent checkboxes.
- Button presses lower the Ceramic surface through `setElevation`.

These are **local interactive design prototypes**. Files, sync meters and calendar
markers are sample data. Controls do not change OS brightness, networking or focus
settings, operate on real files, persist preferences, or run a countdown. There is
no audio, microphone, backend, external service, or automatic animation clock.

## Rendering ownership

Native HTML owns layout, accessibility, focus and interaction. There is one
SurfaceProvider, one device and the existing Surface draw scheduler. `controls.tsx`
is the shared source of basic controls and app-only Ceramic variations;
`everyday.tsx` owns the shared Calendar, Check, Menu, SelectMenu, Files and ChoiceChips.
`desktop.tsx` composes the second and third studies. Library defaults are unchanged.
Raised and recessed objects use Ceramic; CSS supplies layout, flat ink, iconography
and environmental background. Numeric pixel radii respect Surface's geometry contract.

Each behavior has one owner: native details owns dropdown open state; one selected
ID array serves both file views; native inputs drive selection; the calendar's
committed selected date drives keyboard focus. The common stylesheet precedes the
everyday stylesheet at the entry point, so shared defaults do not override the
specific absolute surface geometry. There are no per-study renderer copies.

`phosphor.tsx` is an app-local Material using the normal Surface frame and uniform
contract. The small code display draws curved raster geometry, scanlines, bloom
and bitmap glyphs in WGSL. The fictional code is also real HTML `<pre>` content for
assistive technology; shader glyph data comes from that same string. It is not a
screenshot, texture, second graphics engine or CSS approximation. Other procedural
modes remain available in the material, but are not used by the current homepage.
It needs one additional cached pipeline.

There is no animation at rest or separate render loop per widget. Surface owns
GPU submission and redraws visible-size targets on a dirty frame. This example
does **not** introduce partial redraw or claim mobile GPU performance.

## Validation

`test:atelier` builds the homepage and starts its own production preview on :5191.
`BASE_URL` can target an already-running server. It tests:

- native mouse/keyboard controls, calendar focus and month boundaries;
- real search/sort/filter, mixed and visible-only selection, table/grid consistency;
- dropdown keyboard/dismissal, tags, Dock and search shortcuts;
- changed selection pixels, stable content layout, shader/runtime errors;
- one live device, four shared pipelines, no Canvas2D image copies;
- idle rendering, reduced-motion preferences and URL back/forward;
- screenshots at 1440×1000, 1440×900, 1280×720, 900×600 and 390×844 (DPR 2);
- one-screen desktop composition, narrow reflow, no horizontal overflow, controls
  inside their physical panel;
- explicit unsupported state when WebGPU is unavailable, without a fallback.

Outputs go to `test-results/atelier/` (gitignored). Chrome has been visually
reviewed. `BROWSER=firefox` runs the same suite, but the installed headless Firefox
currently blocklists WebGPU on this machine; its stock configuration is **not a
rendered pass**. HTTPS/localhost and an available WebGPU adapter remain required.

The shadcn migration, MUI comparison, and historical benchmark are untouched.
Nothing here publishes the site or changes remote access.
