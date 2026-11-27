# Website Ceramic Tabs study

The homepage study, Tabs example and Preview and Code switcher use the Ceramic track from the registry.
UI SDK owns tab selection, keyboard behavior and indicator geometry. A single raised
indicator moves along the recessed Ceramic track as the panels crossfade.
Build with `npm run build:site`; run `node tests/site-pointer.mjs` for headless checks.

`createStudyPointer(window)` owns one `SurfaceInputs` source, supplied through
`<OynProvider inputs={studyPointer.inputs}>` instead of Core's default browser listeners.
The decorative macOS-style arrow and Ceramic lighting read the same snapshot.
The application owns animation; Core owns GPU scheduling; Ceramic reads current
coordinates. No synthetic pointer events, gesture policy in materials, or second rendering backend is involved.

Position starts at the viewport center. Without a hover-capable fine pointer, a
slow figure-eight demonstrates lighting until the first real input. Touch follows
one contact, including native scrolling, and holds its last position after release
or cancellation. Real input permanently ends automatic motion for this visit.
Desktop users retain their native cursor; the decorative arrow never intercepts
clicks or replaces native semantics.

Reduced motion disables automatic movement, and hidden pages pause it. The last
unsubscribe releases listeners and animation. Page hide stops the engine and cursor
subscription; back/forward-cache restoration reconnects the same state. WebGPU
failure still leaves native controls and the app-owned cursor usable, without retry.
