# [![OYN wordmark above a raised Ceramic tab in a recessed track](assets/oyn-ceramic.png)](https://oyn.dev/)

**UI you can feel**

OYN separates surface rendering from DOM structure. WebGPU materials draw the surfaces while native elements handle layout and interaction.

## Architecture

- **Your app** owns semantics, layout, interaction and animation.
- **Material** defines how a surface looks.
- **Core** binds materials to DOM elements and renders them with WebGPU.

## Develop

```sh
npm install
npm run build
npm run dev
```

## Website

The [OYN website](https://oyn.dev/) lives in `apps/docs/`. Its Next.js App Router
pages use the public OYN packages. Run `npm run build:site` to export the homepage,
guides and component examples to `apps/docs/out/` for Vercel.
