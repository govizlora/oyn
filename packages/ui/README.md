# @oyn/ui

Reusable React controls sit above Surface (rendering) and Ceramic (appearance).
Atelier owns the component stories, not the implementation.

## Tabs

Under a SurfaceProvider, import `Tabs`, `TabsList`, `TabsTrigger` and
`TabsContent` from `@oyn/ui/tabs`. Match each trigger's `value` to its panel.
The list accepts a pixel `radius` and `selectedTone="matching" | "inverse"`.
The inverse option changes the pigment, not the surrounding lighting environment.

Radix owns selection, keyboard focus and panel relationships; controlled and
uncontrolled usage use its normal API. One standard Ceramic indicator moves to
the selected trigger; reduced-motion users see an immediate change.
