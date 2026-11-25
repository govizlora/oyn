# OYN

A DOM-native material system with a React-free Core and an optional React interface. **WIP.**

[Try the ceramic tabs on oyn.dev](https://oyn.dev/) · [About OYN](https://oyn.dev/about/)

A button is still a `<button>`. The browser lays it out, gives it focus, and handles activation. The GPU renders the material: a raised edge catches the light, a recessed track holds a shadow, and the highlight follows your pointer. Text and hit targets stay in the DOM.

![A raised Surface tab in a recessed ceramic track, above its Native HTML panel](artifacts/ceramic-tabs.png)

## One runtime package

[`oyn`](packages/oyn/) contains Core and the built-in materials. React is optional:

| Entry point | Responsibility |
| --- | --- |
| `oyn` | Core contracts and the shared runtime. Surface owns host binding; the engine owns GPU scheduling and resources. |
| `oyn/react` | `OynProvider` and `useMaterial`: React refs and committed configuration, using the same Core lifecycle. |
| `oyn/materials/ceramic` | Ceramic configuration, optics, shadows and numeric setters. |
| `oyn/adapters/motion` | Connect an external numeric source to a setter, without animation policy. |

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

The optional [`@oyn/ui`](packages/ui/) recipes combine these materials with native
controls, UI SDK or Base UI. They are not another material runtime. Package version
`0.0.0` is currently a local workspace build, not a public npm release.

See [ARCHITECTURE.md](ARCHITECTURE.md) for dependency rules and lifecycle ownership.
