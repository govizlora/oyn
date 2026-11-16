# shadcn/ui + Surface — Buttons + Cards

Independent copy of the original shadcn SaaS preview. The original at ../shadcn remains native (both copies now include the requested theme toggle), and MUI is untouched; this copy can diverge without keeping its layout or behavior synchronized.

Run from the repository root:
```sh
npm run build:packages
npm run dev:shadcn-surface  # http://127.0.0.1:5176
npm run test:shadcn-surface
```

## Scope

Application-level Buttons and all Card shells are adapted. `src/components/surface-card.tsx` is a plain div with one useSurface call and one shared white ceramic Material (elevation 4); no variants, state, effects or fallback. CardHeader/Title/Description/Content remain native layout components.
- default / secondary / destructive / outline: real DOM button ref registered with `useSurface`, elevation 4.
- SurfaceButton accepts only default / secondary / destructive / outline and calls useSurface directly. There is no PanelButton or internal native-Button branch.
- The page explicitly imports native Button for ghost/link controls; these are not SurfaceButton variants or a fallback.
- outline is retained as a convenient name for the light Surface preset, not a promise of native outlined rendering.
- Sidebar's internal controls, Dialog/Sheet panels, dropdowns and all other components remain native.
- One root SurfaceProvider. Buttons inside portals share that provider.
- Native focus, disabled, click, form and Radix composition behavior is retained.
- Surface appearances are defined without CSS backgrounds/borders/shadows at the source, not canceled with extra overrides.
- Native and material buttons in this copy share only layout/size class definitions. This is not a shared business or adapter framework.
- SurfaceButton uses a small explicit HEX palette. It has no Canvas converter, theme sampling/effect, color cache or ref-merging implementation. Renderer handles RGB/HEX parsing; useSurface composes the forwarded ref. Automatic theme synchronization is deliberately not implemented.
- CSS continues to own radius/geometry. No custom press physics, hover motion, loading/recess states, or Still Creek runtime dependencies.

Still Creek's button was read as a reference for keeping native semantics/layout separate from surface material. It was not copied or modified.

Surface is still experimental and supports **WebGPU only**, on HTTPS/localhost with an available adapter/device. Unsupported environments are intentionally unsupported: no WebGL, Canvas2D or CSS fallback, native-style restoration, or future adapter-level fallback is planned. Initialization failures and device loss are reported through `SurfaceProvider.onError` (default: `console.error`), and rendering is disposed. Native Button is used explicitly for ordinary controls, not as a fallback. Arbitrary transforms and complete component-library compatibility are not claimed. Full example UI revalidation was not part of the WebGPU package migration; this demo is not ready for distribution.

The copied upstream shadcn component license remains in src/components/ui/LICENSE.md. See the original example README for registry provenance.

## Color mode

The sidebar footer offers Light / Dark / System above the user menu. System is the default and follows live OS changes; selection is local to this preview and resets on reload. Application ThemeProvider owns the resolved mode. Neutral dark CSS tokens follow https://ui.shadcn.com/docs/theming. Test both demos with `npm run test:theme`.
SurfaceButton and SurfaceCard choose explicit light/dark Materials from the same application theme; the Surface package has no theme awareness or CSS color conversion.

Theme controls use the official Radix/new-york-v4 ButtonGroup from https://ui.shadcn.com/r/styles/new-york-v4/button-group.json (only local import paths adapted). Group orientation uses the official prop for collapsed sidebars; rounding and border joining are owned by ButtonGroup, not ThemeToggle. No Base UI dependency was added.
