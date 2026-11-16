# Ceramic studies

Three desktop-first, full-viewport homepage explorations. Light only; no marketing
copy. The primary visual reference was a quiet white panel of tactile ceramic
controls, with Braun / Teenage Engineering-inspired order and restrained color.

## Open

```sh
npm run dev                 # http://127.0.0.1:5177
npm run build               # root dist/, static hosting, no deployment
npm run test:atelier        # production, headless Google Chrome
```

- `/?study=1`: **Quiet — Porcelain**. Fine partitions, one large dial, three finish
  swatches, six round pads, a segmented selector, a toggle and a step rail.
- `/?study=2`: **Signal — Soft machine**. Asymmetric receiver: a large dial,
  sage accents, four faders, frequency control and a green phosphor screen.
- `/?study=3`: **Play — Future instrument**. Six rotary controls, four faders,
  thirteen piano keys, nine pads, twelve sequence positions, transport controls,
  an amber code display and a green scope / spectrum / orbit / dot-field display.

The bottom pictograms switch studies and update the URL. Back/forward works.
Each study intentionally starts fresh when selected; no hidden persistence.

## Interaction

- Dials: drag vertically; native arrow keys, Home and End also work.
- Faders: native horizontal/vertical range inputs, including keyboard operation.
- Segments, finish swatches and sequence positions: native radio groups.
- Toggle: native checkbox with switch semantics; Space toggles it.
- Pads and piano keys: toggle their indicator; button presses also lower the
  Ceramic surface directly through `setElevation`.
- Signal and Play displays respond to the controls. Play starts optional display
  movement, Pause stops it. Four oscillator pictograms select four different
  procedural display modes in the third study.
- This is a **visual** instrument: no audio, microphone, external services, or
  automatic sound. Small engraved marks and the shader's fictional code listing
  are part of the composition, not explanatory page text.

## Rendering ownership

Native HTML owns layout, accessibility, focus and interaction. There is one
SurfaceProvider, one device and the existing Surface draw scheduler. `controls.tsx`
is the shared source of all controls and app-only Ceramic variations. The library
and its defaults are unchanged. Raised and recessed objects both use Ceramic;
CSS supplies only layout, flat ink, iconography and environmental background.
Numeric pixel corner radii are used for circular surfaces to respect Surface's
current geometry contract.

`phosphor.tsx` is an app-local Material, with the normal Surface frame and uniform
contract. It draws curved raster geometry, scanlines, bloom, waveforms, pixel
spectra and bitmap glyphs in WGSL. The code string is also real HTML `<pre>`
content for assistive technology; the shader glyph data comes from that same
string. It is not a screenshot, image texture, second graphics engine or CSS
approximation. It needs one additional cached pipeline.

One optional 20 Hz app clock updates the signal's numeric phase when Play is on.
Surface still owns GPU submission. There is no animation at rest, when the instrument is powered off, with reduced
motion enabled, or while the document is hidden. No separate render loops per
widget. Current Surface redraws all visible-size targets on a dirty frame; this
example does **not** introduce partial redraw or claim mobile GPU performance.

## Validation

`test:atelier` builds the homepage and starts its own production preview on :5191.
`BASE_URL` can target an already-running server. It tests:

- native mouse/keyboard controls, linked display pixels, button state, radio navigation;
- all four phosphor modes; shader compilation / runtime errors;
- one live device, four shared pipelines, no Canvas2D image copies;
- idle rendering, pause, power-off, live reduced-motion changes, and URL back/forward;
- screenshots at 1440×1000, 1440×900, 1280×720, 900×600 and 390×844 (DPR 2);
- one-screen desktop composition, narrow reflow, no horizontal overflow, controls
  inside their physical instrument;
- explicit unsupported state when WebGPU is unavailable, without a fallback.

Outputs go to `test-results/atelier/` (gitignored). Chrome has been visually
reviewed. `BROWSER=firefox` runs the same suite, but the installed headless Firefox
currently blocklists WebGPU on this machine; its stock configuration is **not a
rendered pass**. HTTPS/localhost and an available WebGPU adapter remain required.

The shadcn migration, MUI comparison, and historical benchmark are untouched.
Nothing here publishes the site or changes remote access.
