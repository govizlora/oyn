# Oyn UI

[ARCHITECTURE.md](../../ARCHITECTURE.md) is the authoritative ownership contract.

Oyn maintains a focused set of Ceramic controls for forms, navigation and
feedback, plus the standalone Card. The [Atelier catalog](../../examples/atelier/src/components/catalog.json)
lists the active SDK families and their previews. Each has a workspace import
such as `@oyn/ui/switch` and a source registry item such as `@oyn/ceramic-switch`.
Other families and their stories are [archived outside the build](../../archive/ui/README.md);
they are not supported imports or installable items.

## Ready / Not ready

[Ready](ready.json) is the component worklist. To promote a family, add its catalog
ID (for example `"button"`, or `"card"` for the standalone Card) to that JSON array.
The entire family and its stories move together. Unlisted components default to
Not ready; leave them unchanged during Ready work. This does not change package
exports, registry items or existing preview URLs.

## Use a component

Give an existing ancestor the `oyn-ui` class to scope the layout styles. Mount
one SurfaceProvider per document. The component's SDK root owns its value,
form participation, keyboard handling and accessible name.

```tsx
import { SurfaceProvider } from "@oyn/surface";
import { Switch, SwitchThumb } from "@oyn/ui/switch";

<SurfaceProvider>
  <main className="oyn-ui">
    <label data-slot="label">
      Show guides
      <Switch name="guides" defaultChecked>
        <SwitchThumb />
      </Switch>
    </label>
  </main>
</SurfaceProvider>;
```

The material attaches to the SDK part's DOM ref. Native text inputs retain
their ref, label and caret inside a recessed frame. Compound inputs share one
frame. Calendar reads the SDK's day state to place a recessed strip across each
week of a selected range, including the raised start and end dates. The paging
buttons share corner centers with the surrounding calendar panel. Positive elevation gives buttons, cards, popup panels
and moving thumbs their form. Text, focus rings and data marks use CSS.

Open the [component catalog](http://127.0.0.1:5177/components.html) or
[Calendar range](http://127.0.0.1:5177/components.html?component=calendar&example=range).

The [Button hover comparison](http://127.0.0.1:5177/components.html?component=button&example=hover-effects)
shows the default recess, `hoverEffect="lower"` (8 → 2), and
`hoverEffect="lift"` (8 → 24). From each hover height, pressing travels to −6 in 150 ms. Lift covers more distance, not more time: all three move fastest at the start and settle without overshoot.
The moving Ceramic surface supplies only relief; the button has no default fill.
Use a native background, e.g. `<Button style={{ backgroundColor: "#b56338" }}>Save</Button>`,
to keep its color when raised, flat or pressed, including without a GPU.

## Tabs

Two implementations of the same Ceramic tabs share one Surface runtime. Use React 19 and mount
`SurfaceProvider` from `@oyn/surface` above the controls.

| Item | Interaction | Components to import in this workspace | Story |
| --- | --- | --- | --- |
| base-ui-ceramic-tabs-list | Base UI; no UI SDK or Tailwind | `CeramicTabsList` from `@oyn/ui/base-ui/tabs` | [Base UI Tabs](http://127.0.0.1:5177/?view=tabs&impl=base-ui) |
| ceramic-tabs-list | UI SDK; no Base UI, Tailwind or global SDK stylesheet | `CeramicTabsList` from `@oyn/ui/tabs` | [UI SDK Tabs](http://127.0.0.1:5177/?view=tabs) |

## Use the installed source

For Base UI, keep the root, tabs and panels. Replace only the list:

```tsx
import { Tabs } from "@base-ui/react/tabs";
import { CeramicTabsList } from "@/components/ui/base-ui-ceramic-tabs-list";

<Tabs.Root defaultValue="design">
  <CeramicTabsList aria-label="Workbench">
    <Tabs.Tab value="design">Design</Tabs.Tab>
    <Tabs.Tab value="code">Code</Tabs.Tab>
  </CeramicTabsList>
  <Tabs.Panel value="design">Preview</Tabs.Panel>
  <Tabs.Panel value="code">Source</Tabs.Panel>
</Tabs.Root>
```

For an existing UI SDK project, replace only its list:

```tsx
import { Tabs, TabsTab, TabsPanel } from "@ui-sdk/react/tabs";
import { CeramicTabsList } from "@/components/ui/ceramic-tabs-list";

<Tabs defaultValue="design">
  <CeramicTabsList aria-label="Workbench" radius={16} selectedTone="inverse">
    <TabsTab value="design">Design</TabsTab>
    <TabsTab value="code">Code</TabsTab>
  </CeramicTabsList>
  <TabsPanel value="design">Preview</TabsPanel>
  <TabsPanel value="code">Source</TabsPanel>
</Tabs>
```

Your existing controlled Tabs root and routing can stay in place. The list
adds only the recessed track and one moving indicator. UI SDK still owns
the selected value and the indicator's measured bounds.

Not using either interaction library? Attach the Ceramic material directly with
`useSurface({ appearance: ceramic, props })` under a SurfaceProvider. The
[native button demo](http://127.0.0.1:5177/surface.html) is a material example, not an installable UI item.

## Source responsibilities

Shared control bindings interpret transient pointer/focus/keyboard feedback without
owning SDK actions or selection. The UI consumer computes a fixed-duration cubic ease-out;
`bindMotion` from `@oyn/surface/adapters/motion` is its only writer to
`material.setElevation`. Ceramic receives instantaneous heights, not animation
targets or curves. Surface observes parameter changes and schedules GPU work.
Reduced motion, interruption and cancellation belong to this consumer source.
While drawable, animation updates retain the material and canvas; selection only
changes the resting height. Flat outline controls derive empty draw programs from
the same numeric source, letting Surface release the canvas without a second ref
lifecycle. CSS does not add press scaling or a second shadow to active Ceramic.

Each list entry renders only its own library’s parts and forwards that library’s
props. Selection, keyboard handling and indicator measurements stay with the
library. `use-ceramic-tabs.ts` binds the two surfaces and maps the shared
appearance props to DOM attributes and CSS variables. `ceramic-tabs-list.css`
uses those attributes and the library’s measurements for layout and motion; it
does not measure or track the active tab.

## Local registry

`npm run build:registry` builds static JSON from the root registry.json.
Atelier runs this before dev/build. After editing item source, rerun it to
refresh the installable JSON. Dev serves the catalog at `/r/registry.json`;
a production build puts it in `dist/r/`. Generated JSON is not committed.

For the full catalog, configure the Oyn namespace in your application's
`components.json`. The CLI resolves the shared files and each component's
dependencies using this URL.

```json
{
  "registries": {
    "@oyn": "http://127.0.0.1:5177/r/{name}.json"
  }
}
```

```sh
npx shadcn add @oyn/ceramic-switch @oyn/ceramic-calendar
```

The installed family modules live under your UI directory in `oyn/`.
The registry contains the same source used by the workspace imports.
Component layouts and documentation recipes are adapted from Vercel Labs'
UI SDK under Apache-2.0. The layout reference revision is
`855bc7fd4df3d61aee33d9d975dc3e4f71debc6c`. The license ships with the
shared files and is available in Atelier under `/recipe-source/LICENSE.txt`.

With a configured shadcn project and resolvable Oyn runtimes:

```sh
npx shadcn add http://127.0.0.1:5177/r/base-ui-ceramic-tabs-list.json
# Alternatively, for an existing UI SDK Tabs tree:
npx shadcn add http://127.0.0.1:5177/r/ceramic-tabs-list.json
```

The files go into your configured UI directory. Only ceramic-tabs-list declares
UI SDK. The CLI is a development tool, not a runtime dependency.

**Release boundary:** the referenced Oyn runtime versions (0.0.0) are local
workspace packages, not public npm releases. For an external local install,
make the built Surface and Ceramic packages available as npm workspaces (or in
a private registry) before running the commands. No public deployment or npm
publication is performed by these builds.

## Relief logo

`@oyn/ui/relief-logo` is a brand graphic, not an interactive control. Place it
inside an existing `SurfaceProvider`; its width follows its container. Give it
a name with `aria-label`, or use `aria-hidden` when it is decorative. For a
static image, use the exported `@oyn/ui/relief-logo.svg` without React or a GPU.

```tsx
import { ReliefLogo } from "@oyn/ui/relief-logo";

<ReliefLogo lightAngle={0} style={{ width: 320 }} />
```

`lightAngle` (degrees) rotates only the gradient lighting, without deforming
or animating the mark. Each instance has one Surface binding; when the GPU is
unavailable, it displays the SVG with a fixed light direction.

In Atelier, open `/relief-logo.html` to compare light directions and download the
vector artwork. After editing the contours or gradients in
`tools/brand/relief.mjs`, run `node tools/brand/relief.mjs` to regenerate the SVG,
WGSL and WebGL2 mirrors together. Use `--check` to verify they match.
