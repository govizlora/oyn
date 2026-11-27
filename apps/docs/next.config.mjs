import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";

export default createMDX()({
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  agentRules: false,
  // The website consumes the built ESM entry points in both dev and production.
  turbopack: {
    resolveAlias: Object.fromEntries(
      ["@oyn/core", "@oyn/materials", "@oyn/react"].map((name) => [
        name,
        "./" +
          relative(
            import.meta.dirname,
            fileURLToPath(import.meta.resolve(name)),
          ),
      ]),
    ),
  },
});
