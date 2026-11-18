# WebGL2 multi-canvas copy benchmark

This is an isolated experiment, **not a production fallback**. Surface and
Ceramic runtime code are unchanged. GLSL is generated on every run from the
production rounded-card and inset WGSL using the pinned, development-only
`naga-wasm` dependency. No independently maintained GLSL is used.

## Run

Requires Node >= 24.12 and installed Google Chrome. All automation is headless.

```sh
npm run test:webgl-copy

# Short smoke run
ROUNDS=1 WARMUP_MS=500 SAMPLE_MS=1000 npm run test:webgl-copy

# Optional CPU-only stress test; this does NOT emulate a slower GPU
ROUNDS=1 DPRS=2 CPU_THROTTLE=4 \
  REPORT_DIR=test-results/webgl-copy-cpu4x npm run test:webgl-copy
```

Reports, individual frame samples, generated shader sources, and screenshots
are written under `test-results/webgl-copy/`. `REPORT_DIR`, `ROUNDS`, `DPRS`,
`MODES`, `WARMUP_MS`, `SAMPLE_MS`, and `CPU_THROTTLE` can override defaults.

## Workload and controls

- 20 raised and 20 inset cards, all onscreen in a 1680 × 1050 CSS-pixel viewport.
- Each card is 120 × 80 CSS pixels with an 18 px radius; raised cards reserve
  their production shadow padding. Total target area is 764,800 pixels at DPR 1
  and 3,059,200 pixels at DPR 2.
- Every RAF updates light position and elevation on all 40 cards: raised +8 to
  +16, inset −2.3 to −4.7. Screenshot labels identify the initial/base settings,
  not the instantaneous animated value.
- The production parameter setters, optics, pass order and premultiplied-alpha
  blending are reused: 60 draw calls per frame in every mode.
- WebGPU uses the existing production renderer directly. All modes bypass
  React, Engine scheduling and DOM measurement to isolate rendering/presentation.
- Three rounds per mode/DPR; each run warms for 2 seconds and samples for 5
  seconds. Mode order rotates between rounds.
- One WebGL2 context, no MSAA/depth/stencil, `preserveDrawingBuffer: false`.
  Copies are 1:1 `drawImage` with 2D `globalCompositeOperation = 'copy'`.
- Shader compilation, screenshots and pixel comparison are outside sampling.
  There is no `finish`, `readPixels` or GPU-completion wait in measured frames.

### Modes

| Mode                    | Drawing and presentation                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `webgpu`                | One shared device, directly rendering 40 element canvases                                                                                  |
| `webgl-shared`          | One visible WebGL2 canvas; performance baseline only                                                                                       |
| `webgl-copy-sequential` | One card-sized scratch canvas; draw a card, immediately copy it to its 2D canvas, repeat 40 times                                          |
| `webgl-copy-batched`    | Draw all cards into disjoint regions of one scratch canvas, then copy all 40 regions to their 2D canvases without intervening WebGL writes |

The batched canvas deliberately uses a simple fixed grid, not a production
atlas allocator. At DPR 2 it is 3232 × 1740 pixels (~21.5 MiB for one RGBA8
image, excluding backing copies and destination canvases). The sequential
scratch canvas is 376 × 296 pixels. Batching trades scratch space for fewer
draw/copy interleavings. A production allocator must bound dimensions/memory;
this experiment does not implement DOM clipping or stacking in a shared overlay.

## Recorded result — 2026-11-17 local time

Apple M3 Pro, macOS arm64, headless Chrome 157.0.8103.79, hardware ANGLE/Metal;
WebGL, WebGPU, accelerated Canvas 2D and GPU compositing enabled.

FPS below is the arithmetic mean of three runs' **RAF callback throughput**,
not a measurement of compositor-presented frames or unbounded GPU throughput.

| Mode                     | DPR 1 FPS | DPR 2 FPS | DPR 2 interval p95 | DPR 2 intervals > 25 ms |
| ------------------------ | --------: | --------: | -----------------: | ----------------------: |
| WebGPU direct            |      60.0 |      60.0 |            16.7 ms |                      0% |
| WebGL2 shared baseline   |      60.0 |      60.0 |            16.8 ms |                      0% |
| WebGL2 sequential copies |      50.5 |      48.2 |            33.4 ms |                   24.6% |
| WebGL2 batched copies    |      60.0 |      60.0 |            16.8 ms |                      0% |

Sequential-copy FPS ranged from 50.4–50.8 at DPR 1 and 48.1–48.2 at DPR 2.
At DPR 2, median JS/API frame time was approximately 0.43 ms sequential vs
0.20 ms batched; median time inside the copy calls was 0.40 vs 0.10 ms.
**These call timings omit deferred work and must not be interpreted as total
copy/GPU cost**: the RAF interval degradation reveals work outside those calls.

The deterministic screenshots matched WebGPU within 2/255 per RGB channel at
DPR 1 and 1/255 at DPR 2. No shader, page, context-loss or visual assertions
failed. Compilation required no changes to the production WGSL.

A separate one-round DPR 2 / 4× CPU-throttling run measured 60.0 / 60.0 / 50.2 /
60.0 FPS respectively. CPU emulation does not slow the GPU and is not evidence
of compatibility-device performance.

## Interpretation

Do not choose per-card draw/copy interleaving as the default fallback based on
its small scratch allocation: it already misses frames on this fast machine.
Batched rendering followed by copies is the promising candidate **among the
paths tested**, while retaining element-local DOM canvases. It is not proven
universally fastest, zero-copy, or sufficient on older GPUs/browsers. Saturating
the 60 Hz RAF cadence only establishes that this workload fits that cadence on
this machine; it does not establish equal rendering cost to WebGPU.
