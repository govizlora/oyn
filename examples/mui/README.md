# Material UI — original SaaS preview

Run from the repository root: `npm run dev:mui` (http://127.0.0.1:5174).

A deliberately small, independent UI-only workspace: overview, projects, team, and settings. Uses Material UI's uncustomized `createTheme()`, `CssBaseline`, Roboto, and native components. `sx` only composes layout/spacing; there are no palette, surface, border, shadow, or component-style overrides.

Reference: [official MUI templates](https://mui.com/material-ui/getting-started/templates/) and [responsive Drawer](https://mui.com/material-ui/react-drawer/). This is a small original composition informed by those patterns, not a copy of the custom-themed Dashboard template.

Search, selects, sorting, pagination, checkbox selection, menus, dialogs, drawer, tabs, switches, and notification feedback are interactive. Local React state is only for the preview. Refresh resets everything; no backend, storage, auth, email delivery, shared business layer, or production business guarantees.

No Surface imports, Provider, refs, appearance removal, or GPU rendering. The Surface version is future work; do not add it until this original UI baseline has been iterated.
