"use client";
import { useState, type ReactNode } from "react";
import { Tabs, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { TabsList } from "@/components/ui/oyn/tabs";
import { ButtonDemo } from "./button-demo";
import { TabsDemo } from "./tabs-demo";
import { CodeBlock, RecessedCode } from "./code-block";
import { Recess } from "./recess";

const examples = { button: ButtonDemo, tabs: TabsDemo };
export type ExampleItem = keyof typeof examples;

export function ExampleTabs({
  item,
  source,
}: {
  item: ExampleItem;
  source: ReactNode;
}) {
  const Demo = examples[item];
  return (
    <Tabs defaultValue="preview">
      <TabsList
        aria-label={item === "button" ? "Button example" : "Tabs example"}
        className="mt-6 mb-3 text-sm"
      >
        <TabsTab value="preview">Preview</TabsTab>
        <TabsTab value="code">Code</TabsTab>
      </TabsList>
      <Recess className="h-[480px] overflow-hidden">
        <TabsPanel value="preview" className="h-full overflow-auto" keepMounted>
          <div className="box-border flex min-h-full flex-wrap items-center justify-center gap-4 px-4 [&>*]:min-w-0">
            <Demo />
          </div>
        </TabsPanel>
        <TabsPanel value="code" className="h-full">
          <CodeBlock className="box-border h-full p-4">{source}</CodeBlock>
        </TabsPanel>
      </Recess>
    </Tabs>
  );
}

export function InstallCommandPicker({
  commands,
}: {
  commands: { name: string; code: ReactNode }[];
}) {
  const [index, setIndex] = useState(0);
  return (
    <div>
      <select
        className="mb-2 rounded-lg border-0 bg-transparent px-3 py-1.5 font-sans text-sm text-inherit"
        aria-label="Package manager"
        value={commands[index].name}
        onChange={(event) => setIndex(event.currentTarget.selectedIndex)}
      >
        {commands.map(({ name }) => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <RecessedCode>{commands[index].code}</RecessedCode>
    </div>
  );
}
