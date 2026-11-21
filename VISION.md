# Oyn UI — Vision & component architecture

Oyn UI is a source-distributed collection of React **web** components with a
tactile, dimensional appearance. Like shadcn/ui, the application owns the
installed component source. The material does not replace HTML layout,
focusable elements or accessible content.

The spatial design principles, component examples and visual review criteria
are collected in [OYN Ceramic 设计哲学](docs/ceramic-design.md).

Current technical boundaries are specified only in [ARCHITECTURE.md](ARCHITECTURE.md).

## One interaction owner per component

- **Base UI + Oyn:** keep the application's Base UI Tabs root, triggers and
  panels. The Ceramic list binds material to Base UI's list and indicator.
  Base UI owns keyboard activation, focus, selection and indicator geometry.
- **UI SDK + Oyn:** keep the application's UI SDK root, tabs, panels, selected
  value and handlers. Replace only TabsList with CeramicTabsList. UI SDK owns
  selection, keyboard navigation, accessibility relationships and indicator
  geometry. Oyn binds Ceramic to the list and indicator; scoped CSS moves the
  indicator, respecting reduced motion. No Base UI, Tailwind, global theme or
  UI SDK web.css is required.

The Tabs story compares the two combinations on identical content. They share
the material bindings and CSS, not their keyboard or selection implementations.
There is no Vanilla React component distribution. For custom interactions,
use `useSurface` with `ceramic` directly on your own DOM elements. The native
button in Atelier demonstrates that material API, not a third component line.
Consumers own animation values; Ceramic owns instantaneous optical response;
Surface owns DOM binding, graphics resources and GPU draw scheduling. Neither package knows what a button or tab is. Mount one
SurfaceProvider above the controls.

## Source, stories and delivery

Author the TSX and adjacent CSS once in `packages/ui/src`. Atelier demonstrates
that source through private workspace imports. The dashboard's Ceramic Tabs
uses UI SDK; its untouched Original comparison stays on Radix. Its comparison
switch is not part of Oyn's component contract.

One shadcn-format registry describes the source files and per-item dependencies.
The build reads those files into static JSON; there is no template copy or
public UI wrapper package. Each item declares its own interaction library, never both. See [the item guide](packages/ui/README.md).

The local registry builds and runs without publishing. Public delivery also
requires hosting the registry and releasing compatible Surface and Ceramic
packages. Neither deployment nor publication is part of a normal build.
