# @oyn/material-ceramic

Light/dark Ceramic optics for @oyn/surface's WebGPU renderer.

```ts
const material = ceramic({ elevation: 12 });
material.setElevation(3); // direct numeric update; no React or bitmap resize
```

Options: `color` (RGB/HEX or `{ light, dark }`), `mode` (`light`/`dark`), `elevation` (default 16), optional `maxElevation`, `rim` (dark edges), `lightRim` (light edges). Elevation may be negative (recess depth), zero (flat), or positive (raised). It must be a finite f32 and below `shadowLightHeight` (480 by default); the point-light projection is singular at the light height. The optional maximum is a canvas-space budget, not a clamp or animation target. Its effective value cannot be smaller than the initial binding height. If omitted, the elevation at binding supplies the budget. Replacing the material can change the explicit maximum; changing the live elevation cannot.

For upward springs, reserve space explicitly: `ceramic({ elevation: 12, maxElevation: 18 })`. Use `bindMotion` from `@oyn/surface/adapters/motion` to connect a MotionValue to `material.setElevation`. The material itself only accepts numbers. If an animation exceeds the reserved height its shadow may be clipped; the library does not alter the curve.

`bounds.ts` derives independent horizontal/vertical margins from element size and budget height, using the infinite-pointer-distance limit. The two shadow contributions are each bounded to 0.0005 alpha outside the estimated region; two CSS pixels cover anti-aliasing. This is a practical visibility bound, not an exact finite support. Elevation zero paints no ground shadow.

Modules: `index.ts` public numeric API, `bounds.ts` extent policy, `optics.ts` shared optical constants, `color.ts` color validation, `shaders.ts` WGSL assembly/surface lighting, `effects/geometry.ts`, `effects/shadow.ts`, `effects/dark-reflection.ts`. Light height and radius are shared between bounds and WGSL generation. No GLSL implementation remains in the package.

## Tuned defaults and overrides

`defaults.json` is the checked-in preset based on the GPU Surfaces story, with `surfaceHeight` renamed to `elevation` (no alias). `ceramicDefaults` exports this frozen preset. Cast/contact shadow strengths are tuned to 0.09 / 0.015 (25% lighter than the source story); geometry and light placement are unchanged. Only explicitly supplied values override it.

All material controls accept numeric options: `shadowLightHeight`, `shadowLightSize`, `shadowStrength`, `contactShadowStrength`, `rim`, `lightRim`, `lightZ`, `reflectionStrength`, `sharpness`, `lightReflectionStrength`, `lightReflectionSpread`, `lightEdgeShade`, `darkFrost`, `lightSurface`, `lightSurfaceTop`, `lightSurfaceShade`, `darkSurface`, plus `elevation` and optional `maxElevation`. `color` explicitly overrides the selected mode's grayscale surface value. Replace the material to change optical configuration; only elevation has an animation setter. The shadow configuration feeds both uniforms and bounds.

```ts
ceramic(); // elevation 16, inherits SurfaceProvider mode
ceramic({ lightReflectionStrength: 2, shadowStrength: 0.1 });
ceramic({ mode: 'dark', darkFrost: 0.2 });
```

Workspace brightness values (`lightWorkspace: 232`, `darkWorkspace: 0`) are exported guidance, not material options. The application owns its background. The shadcn demo uses #f0f0f0 / #000000 backgrounds and default neutral materials; primary/destructive actions retain semantic colors. Avoid pure white neutral surfaces if white highlights should remain visible.


Omit `mode` to inherit Surface's theme (system by default). An explicit `mode` fixes
the material appearance, taking precedence over the provider. Ceramic never reads
`matchMedia` or installs browser listeners. A standalone material outside Surface
starts with light parameters; use `material.resolveMode?.(mode) ?? material` for
low-level integrations. Resolved instances are cached separately per mode, so one
source can safely be shared by light and dark providers. Call `setElevation` on
the source to update all its resolved instances.


### Soft shadow silhouette

The projected shadow convolves the rounded rectangle with a Gaussian area-light
approximation. Straight bands use analytic Gaussian integrals; circular corner
bands use bounded eight-point quadrature. Unlike a signed-distance opacity ramp,
this accounts for reduced occlusion near corners. The existing elevation layers,
pointer projection, contact shadow and strength settings remain unchanged.
This is a soft-shadow approximation, not a full physical light-transport solver.
Canvas padding uses a conservative Gaussian tail bound matching this kernel.

With the Surface demo running on port 5176, `npm run test:ceramic-shadow` compares
the production GPU kernel against dense CPU integration for dialog, card, button,
square and circular silhouettes. Set `BROWSER=firefox` to check Naga as well.

### Signed elevation

`ceramic({ elevation: -2 })` renders a recess using Still Creek's concave
floor/wall optics. `-6` is deeper, `0` is flat, and positive values are raised.
Recess floors use the same resolved Ceramic color (including brightness/color overrides),
not a separate darker palette. Depth controls floor coverage via `1 - exp(-depth)`;
floor color darkens by `min(depth * 0.006, 0.06)`, equivalent to a subtle black overlay,
while wall lighting supplies the edge shading. This bounded linear mapping is
a visual approximation, not a physical light-transport model.
All use the same material API and Surface binding; no nested wrapper is needed.
The old standalone `inset()` entry point is removed.

`setElevation()` follows the same sign selection and updates all cached theme
variants. Negative values use a surface-only program with no exterior shadow;
nonnegative values use the raised program. The renderer switches cached programs
without replacing the canvas. Cross-zero updates are supported, but cross-zero
animations are not guaranteed visually continuous. Animate within one sign.

`maxElevation` remains a nonnegative exterior shadow budget: reserve it when a
surface initialized recessed or flat will later become raised. Negative depth
does not require extra shadow space. Layout radius still belongs to the host.
