# @oyn/material-ceramic

Light/dark Ceramic optics for @oyn/surface's WebGPU renderer.

```ts
const material = ceramic({ elevation: 12 });
material.setElevation(3); // direct numeric update; no React or bitmap resize
```

Options: `color` (RGB/HEX or `{ light, dark }`), `mode` (`light`/`dark`), `elevation` (default 16), optional `maxElevation`, `rim` (dark edges), `lightRim` (light edges). Elevation must be finite and below `shadowLightHeight` (480 by default); the point-light projection is singular at the light height. The optional maximum is a canvas-space budget, not a clamp or animation target. Its effective value cannot be smaller than the initial binding height. If omitted, the elevation at binding supplies the budget. Replacing the material can change the explicit maximum; changing the live elevation cannot.

For upward springs, reserve space explicitly: `ceramic({ elevation: 12, maxElevation: 18 })`. Use `bindMotion` from `@oyn/surface/adapters/motion` to connect a MotionValue to `material.setElevation`. The material itself only accepts numbers. If an animation exceeds the reserved height its shadow may be clipped; the library does not alter the curve.

`bounds.ts` derives independent horizontal/vertical margins from element size and budget height, using the infinite-pointer-distance limit. The two shadow contributions are each bounded to 0.0005 alpha outside the estimated region; two CSS pixels cover anti-aliasing. This is a practical visibility bound, not an exact finite support. Elevation zero paints no ground shadow.

Modules: `index.ts` public numeric API, `bounds.ts` extent policy, `optics.ts` shared optical constants, `color.ts` color validation, `shaders.ts` WGSL assembly/surface lighting, `effects/geometry.ts`, `effects/shadow.ts`, `effects/dark-reflection.ts`. Light height and radius are shared between bounds and WGSL generation. No GLSL implementation remains in the package.

## Tuned defaults and overrides

`defaults.json` is the checked-in GPU Surfaces story preset, with `surfaceHeight` renamed to `elevation` (no alias). `ceramicDefaults` exports this frozen preset. Only explicitly supplied values override it.

All material controls accept numeric options: `shadowLightHeight`, `shadowLightSize`, `shadowStrength`, `contactShadowStrength`, `rim`, `lightRim`, `lightZ`, `reflectionStrength`, `sharpness`, `lightReflectionStrength`, `lightReflectionSpread`, `lightEdgeShade`, `darkFrost`, `lightSurface`, `lightSurfaceTop`, `lightSurfaceShade`, `darkSurface`, plus `elevation` and optional `maxElevation`. `color` explicitly overrides the selected mode's grayscale surface value. Replace the material to change optical configuration; only elevation has an animation setter. The shadow configuration feeds both uniforms and bounds.

```ts
ceramic(); // elevation 16, inherits SurfaceProvider mode
ceramic({ lightReflectionStrength: 2, shadowStrength: 0.1 });
ceramic({ mode: 'dark', darkFrost: 0.2 });
```

Workspace brightness values (`lightWorkspace: 232`, `darkWorkspace: 0`) are exported guidance, not material options. The application owns its background. The shadcn Surface demo uses #f0f0f0 / #000000 backgrounds and default neutral materials; primary/destructive actions retain semantic colors. Avoid pure white neutral surfaces if white highlights should remain visible.


Omit `mode` to inherit Surface's theme (system by default). An explicit `mode` fixes
the material appearance, taking precedence over the provider. Ceramic never reads
`matchMedia` or installs browser listeners. A standalone material outside Surface
starts with light parameters; use `material.resolveMode?.(mode) ?? material` for
low-level integrations. Resolved instances are cached separately per mode, so one
source can safely be shared by light and dark providers. Call `setElevation` on
the source to update all its resolved instances.
