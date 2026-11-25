# OYN Source Map

[The root architecture contract](../../ARCHITECTURE.md) owns cross-package boundaries.
This file only maps Surface internals. “Scheduler” below means GPU draw scheduling,
not the consumer’s numeric animation clock.

This refactor preserves the public API, lifecycle ordering, and rendering behavior. `index.ts` only exports public interfaces. Internal modules import implementations or types directly, never through the public entry point.

## Start with useMaterial

1. `src/react/useMaterial.ts`: the application entry point. Read the ref callback for creation, registration, and cleanup, then the single layout effect for configuration updates. There is no DOM-to-state rerender.
2. `src/core/types/appearance.ts`: the Appearance / AppearanceInstance contracts used by the hook.
3. `src/react/OynContext.ts`: provides the Engine instance shared by the hook and Provider.
4. `src/react/OynProvider.tsx`: the sole Provider-level engine lifecycle.
5. `src/core/engine.ts`: synchronizes registered meshes with rendering objects and schedules measurement and drawing.
6. `src/core/presentation.ts`: per-element DOM layers, dimensions, visual bounds, coordinates, and cleanup.
7. `src/core/renderer.ts`: one-time backend selection. webgpu.ts owns direct submission; the lazy webgl2.ts owns batch rendering and element-local copies.

## Files and Responsibilities

| File | Responsibility |
| --- | --- |
| `react/useMaterial.ts` | React lifecycle of one DOM / Appearance binding |
| `react/OynProvider.tsx` | Provider-level engine lifecycle |
| `react/OynContext.ts` | Provide the Engine instance through React Context |
| `types/appearance.ts` | Visual definition and instance contracts |
| `materialAppearance.ts` | Adapt an externally controlled Material to the same Appearance lifecycle |
| `types/material.ts` | Low-level drawing, bounds, and binding contracts |
| `createParameters.ts` | Numeric parameter validation, versions, and subscriptions |
| `types/input.ts` | Input snapshot and subscription contracts |
| `createInputs.ts` | Lazy shared browser event subscriptions |
| `types/scene.ts` | Mesh type connecting DOM and Material |
| `engine.ts` | Sole GPU draw scheduler and runtime coordination |
| `presentation.ts` | DOM / canvas placement, measurement, and coordinate conversion |
| `renderer.ts` | GPU target and draw submission lifecycle |
| `gpu/Target.ts` | GPU target type |
| `gpu/createLayouts.ts` | Create uniform / static-data binding layouts |
| `gpu/createPipelineCache.ts` | Per-renderer pipeline cache |
| `gpu/createStaticResources.ts` | Static GPU data copies and reference counting |
| `adapters/motion.ts` | Optional external numeric subscription bridge; no Motion runtime dependency |

## Dependency Direction

```text
Public entry point: index.ts (exports only)
  ├─ react/useMaterial → Context + Appearance / Mesh types
  ├─ react/OynProvider → Context + engine
  ├─ materialAppearance → Appearance / Material types
  └─ createParameters (standalone)

engine
  ├─ createInputs → input types
  ├─ presentation → Mesh / binding types
  └─ renderer
       ├─ createLayouts
       ├─ createPipelineCache → Material / layout types
       └─ createStaticResources → static data types
```

The React adapter depends on the runtime; the runtime does not import React. GPU helpers do not depend on Engine, React, or Presentation. Type files do not instantiate runtime services; `ReturnType` inference uses type-only imports.

## Extraction Boundaries

Independent entry points and factories with distinct responsibilities have their own files. Internal callbacks sharing one lifecycle closure (such as `draw` / `dispose`, `retain` / `drop`, and React effect cleanup) stay with their owner. This avoids exposing private state as mutable objects passed between files.

GPU cache extraction only reorganizes renderer internals: the renderer still creates and owns the caches, and Engine remains the sole GPU draw scheduler. No additional resource lifecycle or drawing control path is introduced.

## Type Organization

Cross-module contracts live in `src/core/types/`: Appearance, Material, input snapshots, and Mesh. Implementation-specific types stay beside their owner, such as `gpu/Target.ts`, `MaterialOptions` in `react/useMaterial.ts`, and `Engine` in `engine.ts`. There is no additional types barrel; import the specific file directly. Public package exports remain unchanged.

The hook keeps one memoized binding handle per appearance/engine pair. Creating this handle has no side effects. Its ref creates and registers the instance, and its cleanup releases it. One layout effect saves committed configuration and updates the active instance; configuration changes do not replace the ref. Reattachment starts with the last committed configuration, then the layout effect applies the current commit before the scheduled draw.

Each Provider owns one stable Engine instance. Creating it has no browser side effects. The Provider starts/stops browser resources in effects; Strict Mode can restart resources without replacing the instance. Context exposes this instance directly, not a separate forwarding contract. `requestMeasure` schedules measurement and drawing; `requestDraw` schedules drawing only.

Presentation owns `data-oyn-active` during GPU attachment. Engine failure latches the Engine as failed and disposes every presentation, restoring CSS before releasing its other resources, then logs the cause. Hooks do not create or update appearances after failure. There is no Provider error callback or React fallback state.
