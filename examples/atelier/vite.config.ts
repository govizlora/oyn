import { writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { controls } from "./src/ripple-controls";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "save-local-ripple-defaults",
      configureServer(server) {
        const file = new URL("./src/ripple-defaults.json", import.meta.url);
        server.middlewares.use(
          "/__atelier/ripple-defaults",
          async (req, res) => {
            const host = req.headers.host ?? "";
            if (
              req.method !== "POST" ||
              !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ||
              req.headers.origin !== "http://" + host ||
              req.headers["content-type"] !== "application/json"
            ) {
              res.writeHead(403).end();
              return;
            }
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
                if (body.length > 4096) {
                  res.writeHead(413).end();
                  return;
                }
              }
              const input = JSON.parse(body);
              const values: Record<string, number> = {};
              for (const group of controls)
                for (const { key, min, max, step } of group.items) {
                  const v = input[key];
                  const n = (v - min) / step;
                  if (
                    !Number.isFinite(v) ||
                    v < min ||
                    v > max ||
                    Math.abs(n - Math.round(n)) > 1e-7
                  )
                    throw Error();
                  values[key] = v;
                }
              if (typeof input.hdr !== "boolean" || values.depth >= values.gap)
                throw Error();
              const tmp = new URL(file.href + "." + randomUUID() + ".tmp");
              try {
                await writeFile(
                  tmp,
                  JSON.stringify({ hdr: input.hdr, ...values }, null, 2) + "\n",
                );
                await rename(tmp, file);
              } catch {
                res.writeHead(500).end();
                return;
              }
              res.writeHead(204).end();
            } catch {
              res.writeHead(400).end();
            }
          },
        );
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        componentPreview: new URL("./component-preview.html", import.meta.url).pathname,
        components: new URL("./components.html", import.meta.url).pathname,
        main: new URL("./index.html", import.meta.url).pathname,
        flip: new URL("./flip.html", import.meta.url).pathname,
        surface: new URL("./surface.html", import.meta.url).pathname,
      },
    },
  },
});
