import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HighlightedCode } from "./highlighted-code";
import {
  ExampleTabs,
  InstallCommandPicker,
  type ExampleItem,
} from "./example-controls";

export async function ComponentExample({ item }: { item: ExampleItem }) {
  const source = await readFile(
    join(process.cwd(), item + "-demo.tsx"),
    "utf8",
  );
  return (
    <ExampleTabs
      item={item}
      source={<HighlightedCode lang="tsx">{source.trimEnd()}</HighlightedCode>}
    />
  );
}

export function InstallCommand({ item }: { item: ExampleItem }) {
  const runners = {
    npm: "npx",
    pnpm: "pnpm dlx",
    yarn: "yarn dlx",
    bun: "bunx",
  };
  const commands = Object.entries(runners).map(([name, runner]) => ({
    name,
    code: (
      <HighlightedCode lang="bash">{`${runner} shadcn@latest add http://127.0.0.1:7456/r/${item}.json`}</HighlightedCode>
    ),
  }));
  return <InstallCommandPicker commands={commands} />;
}
