# @oyn/ceramic

Light/dark Ceramic optics for @oyn/surface's WebGPU renderer.

Raised analytic cards and baked controls now share the geometry/lighting contract
and surface entry point. See [the architecture handoff](../../HANDOFF.md) for
ownership, asset formats, benchmarks and the pending cross-material migration.
`ceramic` is a stable `Appearance<CeramicProps>` definition. `./baked` also exports
`baked` with `{ geometry, ...options }` props. `./card` remains an explicit low-level
comparison adapter; `./sculpted` is deprecated and unused by Atelier. Inset Ceramic
remains a distinct optical implementation within the same appearance.

```tsx
const ref = useSurface({
  appearance: ceramic,
  props: { elevation: pressed ? 3 : 12, maxElevation: 12 },
});
return <button ref={ref}>Confirm</button>;
```

Ordinary prop updates reuse a node-local instance and parameter block; no useMemo or
setter is required. Surface owns GPU resources, Ceramic owns visual configuration.
`createCeramicMaterial(options)` retains the explicit low-level program API for engine
integrations and numeric-source adapters; it is not the primary React API.

Options: `color` (RGB/HEX or `{ light, dark }`), `colorScheme` (`light`/`dark`), `elevation` (default 16), optional `maxElevation`, `rim` (dark edges), `lightRim` (light edges). Elevation may be negative (recess depth), zero (flat), or positive (raised). It must be a finite f32 and below `shadowLightHeight` (480 by default); the point-light projection is singular at the light height. The optional maximum is a canvas-space budget, not a clamp or animation target. Its effective value cannot be smaller than the initial instance height. If omitted, the elevation at material creation supplies the budget. Replacing the material can change the explicit maximum; changing the live elevation cannot.

For upward springs, reserve space explicitly: `ceramic({ elevation: 12, maxElevation: 18 })`. Use `bindMotion` from `@oyn/surface/adapters/motion` to connect a MotionValue to `material.setElevation`. The material itself only accepts numbers. If an animation exceeds the reserved height its shadow may be clipped; the library does not alter the curve.

`bounds.ts` derives independent horizontal/vertical margins from element size and budget height, using the infinite-pointer-distance limit. The two shadow contributions are each bounded to 0.0005 alpha outside the estimated region; two CSS pixels cover anti-aliasing. This is a practical visibility bound, not an exact finite support. Elevation zero paints no ground shadow.

Modules: `index.ts` public numeric API, `bounds.ts` extent policy, `optics.ts` shared optical constants, `color.ts` color validation, `shaders.ts` analytic-card assembly, `finish.ts` optical normalization,
`effects/ceramic-surface.ts` shared entry point, `effects/ceramic-lighting.ts` optical response,
`effects/ceramic-geometry.ts` card geometry, `effects/geometry.ts`, `effects/shadow.ts`, `effects/dark-reflection.ts`. Light height and radius are shared between bounds and WGSL generation. No GLSL implementation remains in the package.

## Tuned defaults and overrides

`defaults.json` is the checked-in preset based on the GPU Surfaces story, with `surfaceHeight` renamed to `elevation` (no alias). `ceramicDefaults` exports this frozen preset. Cast/contact shadow strengths are tuned to 0.09 / 0.015 (25% lighter than the source story); geometry and light placement are unchanged. Only explicitly supplied values override it.

All material controls accept numeric options: `shadowLightHeight`, `shadowLightSize`, `shadowStrength`, `contactShadowStrength`, `rim`, `lightRim`, `lightZ`, `reflectionStrength`, `sharpness`, `lightReflectionStrength`, `lightReflectionSpread`, `lightEdgeShade`, `darkFrost`, `lightSurface`, `lightSurfaceTop`, `lightSurfaceShade`, `darkSurface`, plus `elevation` and optional `maxElevation`. `color` explicitly overrides the selected mode's grayscale surface value. Update appearance props to change optical configuration. The low-level program has an explicit elevation setter. The shadow configuration feeds both uniforms and bounds.

```ts
useSurface({ appearance: ceramic, props: {} }); // elevation 16, light by default
useSurface({ appearance: ceramic, props: { lightReflectionStrength: 2, shadowStrength: 0.1 } });
```

Workspace brightness values (`lightWorkspace: 232`, `darkWorkspace: 0`) are exported guidance, not material options. The application owns its background. The shadcn demo uses #f0f0f0 / #000000 backgrounds and default neutral materials; primary/destructive actions retain semantic colors. Avoid pure white neutral surfaces if white highlights should remain visible.


The application owns theme selection: pass its resolved `colorScheme` through appearance
props. Omission defaults to light. Ceramic does not read `matchMedia`; its per-target
binding subscribes to Surface's shared pointer input service. Standalone materials
can use `material.resolveColorScheme?.(colorScheme) ?? material` for low-level
integrations. Resolved instances are cached separately per color scheme, so one
source can safely be shared across light and dark surfaces. An explicit
`colorScheme` fixes the material appearance and disables resolution. Call
`setElevation` on the source to update all its resolved instances.


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

`useSurface({ appearance: ceramic, props: { elevation: -2 } })` renders a recess using Still Creek's concave
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

## Pointer light policy

```tsx
useSurface({ appearance: ceramic, props: {
  elevation: 16,
  light: { source: 'pointer', position: { x: 100, y: 100 },
    onLeave: 'hold', onBlur: 'return', onHidden: 'hold' },
}});
```

`position` is a fallback/return position in viewport CSS pixels (default 100,100).
Default source is pointer; leave/blur/hidden default to hold the last known position.
`return` is immediate, not an animation. These three input facts stay independent.
`source: 'fixed'` uses position without subscribing to pointer events. Surface only
records facts and converts coordinates; Ceramic owns all light policy. The existing
low-level card/baked adapters use the same pointer adapter with default hold policy.
CSS corner radius is read by the Ceramic binding at measurement time, not by core.

Production shadows use four uniform heights (5,11,17,23)/24, weight 1/4 each.
Contact opacity remains P + A*(1-P). This API migration does not change optical math.

## Minimal usage and defaults

```tsx
useSurface({ appearance: ceramic, props: { elevation: 16 } });
```

Both `maxElevation` and `light` are optional. Without an explicit maximum, the
exterior shadow budget uses the initial appearance-instance elevation (clamped to zero for an
inset); it does not track subsequent elevation changes. If elevation is also
omitted, its default is 16. Specify maxElevation only when later raised states
need more space. Increasing elevation beyond the reserved budget can clip shadows.

`ceramicDefaults.light` explicitly contains source pointer, position (100,100),
and onLeave/onBlur/onHidden all set to hold. No return behavior is enabled unless
requested. These same defaults drive the input adapter, not a duplicate preset.
