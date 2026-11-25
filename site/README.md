# OYN website

[oyn.dev](https://oyn.dev/) is built from this repository. From the repository root, run `npm ci` and `npm run build:site`. The static site is written to `site/dist/`.

The Vercel project `govi/oyn` tracks `govizlora/oyn`. Pushes to `main` trigger production builds using the root [Vercel configuration](../vercel.json). Publish source changes rather than committing the build output.
