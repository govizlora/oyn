import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { highlightOptions } from "./highlight-options";

export const components = defineDocs({ dir: "content/components" });
export default defineConfig({
  mdxOptions: { rehypeCodeOptions: highlightOptions },
});
