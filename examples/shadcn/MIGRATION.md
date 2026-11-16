# shadcn → Ceramic

## Directories Define Boundaries

| Location | Responsibility | Reads mode? |
| --- | --- | --- |
| `original/registry/new-york-v4/` | Complete upstream source snapshot; no local edits | No |
| `original/registries/`, `original/manifest.json` | Upstream responses and file verification records | No |
| `src/ceramic/` | Our independent material components | No |
| `src/app/registry.tsx`, `src/app/ui/` | App-level implementation selection and export wiring | Yes; only the registry selects implementations |
| `src/app/dashboard/`, `src/app/page.tsx` | Local dashboard logic and integration | App may select decorative presentation |
| `src/app/appearance.tsx` | Sole mode state and persistence | Yes |

Mode switches rebuild demo content with `Fragment key={appearance}` inside the stable app main-panel scroll container, naturally resetting component-local state. The outer shell and sidebar remain mounted, allowing the browser to preserve scrolling without scrollTop caching or restoration. Do not transfer component state or maintain two background pages. Theme changes do not rebuild content.

## Registry Migration Checklist

- **Button**: Ceramic solid/outline buttons; ghost/link variants are plain text buttons without material.
- **Card**: Ceramic surface.
- **PanelSurface**: Main content panel with elevation 8. App layout and scroll containers stay unchanged; the registry switches only its background surface. Material and scrolling layers are siblings so internal scrolling neither clips shadows nor moves the surface. Original uses the upstream SidebarInset CSS background/shadow without source changes.
- **Navigation and shell colors**: Ceramic mode uses sidebar tokens consistently: light `#e8e8e8`, darker than default material `#f0f0f0`; dark `#181818`, lighter than default material `#0c0c0c`.
- **Dialog**: Ceramic dialog; internal buttons use Ceramic Button directly.
- **Tabs**: Default lists use inset, with the sliding plate reusing default neutral Ceramic; line variants register no material. Radix owns selection, layout observation supplies target geometry, and CSS transitions own sliding while respecting reduced motion.
- **Other components**: The app exports Original directly; composed upstream components retain Original internal dependencies without automatic recursive replacement.

To add a migration, implement it in `src/ceramic/`, register it in the app registry, and update app exports. Do not modify original or let Ceramic import app mode or registry.

## Implementation Constraints

- Ceramic uses `useSurface` directly; there is no `useAppearanceSurface` that toggles materials based on app mode.
- Each appearance has one drawing source; do not overlay the original CSS background/shadow.
- SurfaceProvider, theme, and scheduling each retain a single control source.
- Do not introduce another canvas, animation loop, or duplicate ref-composition mechanism; preserve native DOM interactions and accessibility semantics.
- Groove formulas and presets are ported from Still Creek, excluding glass, focus light bands, and loading effects; leave Still Creek source unchanged.
- Handle layout corrections, preview scrolling, and business demos only in the app.
- The stable app `data-dashboard-clip` shell owns rounded clipping of native scrollbars, using `overflow-hidden` only in Ceramic mode; the inner layer remains the sole scroll owner. Material/shadows are siblings of the clipping shell and remain unclipped. Do not move overflow-hidden to the entire main panel.
- The app sidebar uses `z-auto` instead of the upstream `z-10`, allowing the later-painted main-panel shadow to naturally cover the navigation background. Material elevation affects optics only, not DOM stacking. Do not fix occlusion by escalating z-index, duplicating shadows, or adding a global shadow layer. The mobile Sheet remains in a separate overlay.

## Validation

`npm run test:shadcn` checks all Original files against saved upstream responses and SHA-256 hashes, and verifies that Ceramic does not depend on app mode; it also runs headless main-panel color/material, scroll retention, dashboard, Tabs, and Dialog tests. Tests explicitly require rebuild/reset after mode switches, not preservation of drafts or internal DOM across modes; the outer scroll container and scroll position must remain intact.
