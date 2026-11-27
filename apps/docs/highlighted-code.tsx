import { highlight } from "fumadocs-core/highlight";
import { highlightOptions } from "./highlight-options";

export async function HighlightedCode({
  children,
  lang,
}: {
  children: string;
  lang: "tsx" | "bash";
}) {
  const tokens = await highlight(children, {
    ...highlightOptions,
    lang,
    structure: "inline",
  });
  return <code>{tokens}</code>;
}
