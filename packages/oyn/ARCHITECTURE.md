# OYN source map

[The root architecture contract](../../ARCHITECTURE.md) is authoritative.
This document maps the one runtime package, not a second API specification.

## Reading order

1. `src/core/types/material.ts`: stable `Material<P>` definitions and live
   `MaterialInstance<P>` drawing objects, including update/disposal and host hooks.
2. `src/core/surface.ts`: the framework-independent host lifecycle. A handle owns
   one instance per bound host; all its committed configuration updates use this path.
3. `src/react/useMaterial.ts`: refs and committed props forwarded to Core.
4. `src/react/OynProvider.tsx`: starts/stops one shared engine and provides Context.
5. `src/core/engine.ts`: browser resources, HDR preference, shared inputs,
   measurement/draw scheduling, target binding and fatal failure teardown.
6. `src/core/presentation.ts`: canvas placement, bounds and active/fallback marker.
7. `src/core/renderer.ts`: the only renderer. It acquires WebGPU, allocates
   resources and submits draws. Acquisition failure uses the same engine failure
   path as execution failure; native CSS remains visible.
8. `src/materials/ceramic/material.ts`: Ceramic definition and instance factory.
   `update` changes the drawing object itself; there is no nested material wrapper.

The former UI package, examples, site and experimental materials are frozen in
the ignored local archive; they are not part of this source map or any build.

## Entry points and dependency direction

- `oyn`: Core factories and contracts. No React or concrete-material imports.
- `oyn/react`: `OynProvider`, `useMaterial` and React-facing option types.
- `oyn/materials/ceramic`: standard signed analytic Ceramic only.
- `oyn/adapters/motion`: subscribe/forward/unsubscribe only, no animation policy.

```text
React interface → Core Surface → Material protocol ← concrete materials
                        ↓                ↑
                   shared engine → renderer
```

Core cannot import React, UI SDKs, concrete materials or animation libraries.
Materials can import Core contracts and the standalone parameter utility, not
Surface, Engine, renderer or a public barrel that re-exports them. React cannot
introduce a second instance lifecycle or import concrete materials.
Internal modules import their actual dependencies, not the public barrel.
`npm run check:architecture` enforces these directions, including type imports.

## Ownership and lifecycle

Creating an engine or Surface handle has no browser side effects. Surface binding
creates/registers an instance; unbinding releases its engine entry and disposes
that instance exactly once. A handle may bind multiple distinct hosts; each gets
its own instance and receives subsequent configuration updates. Duplicate host
binding in an engine is an error.

React creates a stable handle per definition/engine pair. The ref binds it, and
one layout effect supplies committed configuration. Suspended renders cannot
publish configuration. React does not create or update material instances itself.

The engine owns resource start/stop cycles. Stop aborts target subscriptions,
releases presentations and GPU resources, and removes browser/HDR listeners.
Existing host instances can survive a resource restart. Fatal failure stops the
engine, disposes registered Core surfaces, logs the cause, and prevents restart.

`SurfaceBinding.material` is an optional target-local drawing view for a shared
imperative source (for example, Ceramic in two color-scheme environments). It
has no separate configuration owner. Only Surface calls bind; it never recursively
binds that view. Target subscriptions clean up on abort; instance-owned resources
clean up on host disposal.

GPU caches stay in the renderer. Consumer clocks publish numeric values through
`bindMotion`; only the shared engine schedules GPU draws. Empty passes release
presentation resources without destroying the host binding or its subscriptions.
