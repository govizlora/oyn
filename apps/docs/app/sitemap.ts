import type { MetadataRoute } from "next";
import { catalog } from "../catalog";
import { origin } from "../meta";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/about/",
    "/docs/",
    "/docs/components/",
    ...catalog.getPages().map((page) => page.url + "/"),
  ].map((path) => ({ url: new URL(path, origin).href }));
}
