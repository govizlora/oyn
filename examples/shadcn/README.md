# shadcn/ui — original SaaS preview

Run from the repository root: `npm run dev:shadcn` (http://127.0.0.1:5175).

Independent UI-only workspace: overview, projects, team, and settings. Uses Radix-backed shadcn/ui, the existing new-york preset, Tailwind 4, and the official neutral tokens. No Surface imports or appearance-removal overrides.

References:
- [Official dashboard blocks](https://ui.shadcn.com/blocks/dashboard)
- [Official tasks example](https://ui.shadcn.com/examples/tasks)
- [Theming](https://ui.shadcn.com/docs/theming)
- Registry components: `https://ui.shadcn.com/r/styles/new-york/{name}.json`
- Neutral tokens: `https://ui.shadcn.com/r/colors/neutral.json`

Registry component styling and behavior are retained. Import aliases are localized, and legacy CSS-variable arbitrary values are expressed as `[var(--name)]` for Tailwind 4 compatibility (no visual redesign). The neutral theme includes the legacy destructive-foreground/sidebar-background aliases needed by these components. Upstream MIT license is retained in `src/components/ui/LICENSE.md`.

The app is a small composition of official primitives, not a verbatim copy of dashboard-01. Layout/spacing and page typography are application composition; there are no custom surface colors, shadows, or radii.

All business state is local to this app and resets on refresh. There is no shared business layer, backend, storage, auth, or email delivery. Forms and actions demonstrate UI behavior, not production workflows. The upstream Sidebar owns its own open/collapsed behavior.

Only the original version is implemented. A Surface version is deferred until the native baseline is ready.

## Color mode

The sidebar footer offers Light / Dark / System above the user menu. System is the default and follows live OS changes; selection is local to this preview and resets on reload. Application ThemeProvider owns the resolved mode. Neutral dark CSS tokens follow https://ui.shadcn.com/docs/theming. Test both demos with `npm run test:theme`.

Theme controls use the official Radix/new-york-v4 ButtonGroup from https://ui.shadcn.com/r/styles/new-york-v4/button-group.json (only local import paths adapted). Group orientation uses the official prop for collapsed sidebars; rounding and border joining are owned by ButtonGroup, not ThemeToggle. No Base UI dependency was added.
