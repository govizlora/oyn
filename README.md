# OYN

A DOM-native material system with a React-free Core and an optional React interface. **WIP.**

HTML and CSS own layout, content and interaction. OYN renders material relief with
WebGPU. When WebGPU is unavailable or fails, native CSS remains visible; there is
no second GPU backend.

## One package, four entry points

| Entry point | Responsibility |
| --- | --- |
| `oyn` | Core contracts, Surface host lifecycle and shared rendering engine |
| `oyn/react` | `OynProvider` and `useMaterial`, forwarding to the same Core lifecycle |
| `oyn/materials/ceramic` | Standard signed Ceramic relief, optics and numeric setters |
| `oyn/adapters/motion` | Connect a numeric source to a setter; no animation policy |

```tsx
import { OynProvider, useMaterial } from "oyn/react";
import { ceramic } from "oyn/materials/ceramic";

function Key() {
  const ref = useMaterial({ material: ceramic, props: { elevation: 8 } });
  return <button ref={ref}>Confirm</button>;
}

export function Example() {
  return <OynProvider><Key /></OynProvider>;
}
```

Version `0.0.0` is a local workspace build, not a public npm release.
See [ARCHITECTURE.md](ARCHITECTURE.md) for ownership and dependency rules,
[the API guide](packages/oyn/README.md) for usage, and
[Ceramic optics](packages/oyn/src/materials/ceramic/README.md) for material behavior.

## Fast iteration

```sh
npm install
npm test               # Build, architecture/types, numeric/lifecycle contracts, package isolation
npm run test:browser   # Headless WebGPU, CSS fallback and Ceramic optical regressions
```

`npm run build` builds only `oyn`. No component catalog, registry, site, shader
transpiler or archived example participates. Browser tests are explicit, not part
of the fast default suite. `npm run dev` serves the isolated fixtures under
`/tests/fixtures/`; it does not launch a browser or a component showcase.

## Frozen local archive

At cleanup, the Ready component list was empty. All UI components, examples,
showcases, site/deployment files, experimental materials and their dedicated tests
were moved to `archive/2026-11-25-lean-core/`, outside Git and every active command.
The local archive includes original paths, a checksum and a complete baseline
snapshot. It must not be maintained or migrated with Core.

A fresh clone does not include that local archive. The tracked baseline remains
recoverable from commit `67c2f59`. Restore only explicitly selected work; do not
reactivate the old workspace or its entire test suite.
