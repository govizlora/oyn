import { loader } from "fumadocs-core/source";
import { components } from "./.source/server";

export const catalog = loader({
  baseUrl: "/docs/components",
  source: components.toFumadocsSource(),
});
