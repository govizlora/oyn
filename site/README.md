# OYN website

[oyn.dev](https://oyn.dev/) is built from this repository. From the repository root, run `npm ci` and `npm run build:site`. The static site is written to `site/dist/`.

The Vercel project `govi/oyn` tracks `govizlora/oyn`. Pushes to `main` trigger production builds using the root [Vercel configuration](../vercel.json). Publish source changes rather than committing the build output.

## Pointer study

The site supplies one stable `SurfaceInputs` source to `OynProvider`.
It starts at the viewport center. Devices without a hover-capable fine pointer
show a non-interactive macOS-style arrow following a slow figure-eight. The same snapshot
drives Ceramic lighting; no synthetic DOM events or separate lighting loop is used.

The first real pointer or touch permanently stops the demonstration for this
page visit. Touch follows the primary contact, including native scrolling, then
holds the last position after release/cancellation. Mouse users keep the native
cursor. Reduced motion disables the demonstration; hidden pages suspend it.
The source releases listeners and its animation when its last subscriber leaves.

Run `node tests/site-pointer.mjs` for headless mobile and desktop regressions.
