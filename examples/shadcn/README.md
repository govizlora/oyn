# shadcn Dashboard — Original / Ceramic

## Run

From the repository root:
- `npm run dev` / `npm run dev:shadcn` → http://127.0.0.1:5176
- `npm run build` → root `dist/`
- `npm run test:shadcn` and `npm run test:theme` (server running)

## Three separate responsibilities

- **`original/`**: immutable official new-york-v4 registry snapshot, including
  dashboard-01, its data, UI primitives and mobile hook. Extracted file contents
  are byte-for-byte identical to the saved registry responses. `manifest.json`
  records SHA-256 checksums. Never edit these files for a local adaptation.
- **`src/ceramic/`**: independent Button, Card, Dialog, Tabs and low-elevation PanelSurface implementations,
  plus their materials. They render Ceramic directly and know nothing about the
  app's Original / Ceramic selector. UI state stays inside components.
- **`src/app/`**: the comparison application, adapted dashboard, theme, mode
  controls and component registry. `registry.tsx` selects migrated components;
  `ui/` contains thin app import adapters and direct original exports for the
  remaining primitives. These adapters are wiring, not a third component library.

Changing mode remounts only the demo contents with `key={appearance}` inside a
stable scroll container. The outer shell/sidebar and native scroll position stay
intact, without a scroll cache or restoration effect. Table pagination,
selection, tab state, open dialogs and drafts reset. No state transfer or cache
is maintained between implementations. The mode/theme preference itself persists.

## Upstream and build integration

Source: https://ui.shadcn.com/r/styles/new-york-v4/dashboard-01.json

Official preview: https://ui.shadcn.com/blocks/dashboard

`upstream.json` lists the original dashboard import sources. The exact saved
responses for the complete local snapshot live in `original/registries/`, and
`original/manifest.json` is the authoritative snapshot inventory.

Unchanged upstream imports are resolved by Vite/TypeScript aliases: the upstream
registry namespace points at `original/`, `cn` uses the app utility, and the
upstream Sonner `next-themes` hook receives the app's resolved theme through a
small read-only bridge. This does not add another theme controller or modify
upstream source. Original composite components keep their original dependencies;
Ceramic Dialog uses Ceramic Button explicitly.

See `UPSTREAM-LICENSE.md` and [migration boundaries](MIGRATION.md).

## Application-only adaptations

The app dashboard lives in `src/app/dashboard/` and `src/app/page.tsx`, separate
from the untouched upstream dashboard snapshot. It adds an inset preview with
independent scrolling, comparison controls, an initials avatar fallback and a
local Add Section dialog. Stat-card decorative gradients are selected in the
app, not in either component library. No backend/account actions are provided.

Ceramic is experimental and WebGPU-only. Original is a comparison implementation,
not an automatic compatibility fallback. All browser tests run headlessly.

The main content panel separates its stationary background surface from the
stable scrolling viewport. Ceramic uses elevation 8 with no duplicate CSS shadow;
Original uses the original inset panel CSS paint. The sidebar/frame is darker
than the content in light mode and lighter in dark mode.

### Navigation depth motion

Ceramic menu items animate their own material elevation from an almost-flat negative value to -4 on hover and -6 while pressed. The shared UI motion source uses a 150 ms cubic ease-out; interrupted gestures turn immediately from the current position. Exit settles before detaching the surface. Reduced-motion preferences bypass the transition. No opacity, scale, or cross-zero shader transition is layered onto the depth animation.

### Selects and dropdown popups

Select triggers rest at elevation -2.3; hover/focus and press use the same -4 / -6 recess interaction and easing as sidebar navigation. Radix retains keyboard focus, selection, disabled behavior, and dismissal. Popup cards use elevation 16 and no CSS background/shadow; scrolling belongs to an inner viewport so the exterior shadow remains visible. Submenus are portaled outside parent scrolling. Ordinary, checkbox, radio, and submenu items share one recess interaction hook. Original mode continues to use the untouched upstream components.
