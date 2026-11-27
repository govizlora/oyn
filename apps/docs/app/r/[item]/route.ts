import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { notFound } from "next/navigation";
import registry from "../../../../../registry.json";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return registry.items.map(({ name }) => ({ item: name + ".json" }));
}

export async function GET(_: Request, context: RouteContext<"/r/[item]">) {
  const { item } = await context.params;
  const entry = registry.items.find(({ name }) => name + ".json" === item);
  if (!entry) notFound();
  const files = await Promise.all(
    entry.files.map(async (file) => ({
      ...file,
      content: await readFile(
        resolve(process.cwd(), "../..", file.path),
        "utf8",
      ),
    })),
  );
  return Response.json({ ...entry, files });
}
