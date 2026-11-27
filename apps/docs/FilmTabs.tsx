"use client";
import { Tabs, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { TabsList, TabsPanels } from "@/components/ui/oyn/tabs";

const sections = [
  {
    tab: "Surface",
    title: "Native HTML",
    text: "Tab in. Switch with the arrow keys.",
  },
  {
    tab: "Light",
    title: "Reflections",
    text: "The light follows your pointer.",
  },
  {
    tab: "Motion",
    title: "Motion in sync",
    text: "The tab glides as the words fade.",
  },
];

export function FilmTabs() {
  return (
    <Tabs defaultValue="Surface" className="[--oyn-radius:32px]">
      <TabsList
        aria-label="Ceramic details"
        className="w-full text-[clamp(.875rem,3.55cqw,1.5rem)] leading-tight [--track-gap:8px]!"
      >
        {sections.map(({ tab }) => (
          <TabsTab className="min-h-16 min-w-0 flex-1!" key={tab} value={tab}>
            {tab}
          </TabsTab>
        ))}
      </TabsList>
      <TabsPanels className="mt-6! p-[clamp(1rem,5.2cqw,2.25rem)]!">
        {sections.map(({ tab, title, text }) => (
          <TabsPanel key={tab} value={tab}>
            <h2 className="m-0 text-[clamp(1.5rem,6cqw,2.55rem)] leading-[1.15] font-normal [text-box:trim-start_cap_alphabetic]">
              {title}
            </h2>
            <p className="m-0 mt-[.45em] text-[clamp(.875rem,3.15cqw,1.34rem)] leading-[1.4] text-neutral-600 dark:text-neutral-400">
              {text}
            </p>
          </TabsPanel>
        ))}
      </TabsPanels>
    </Tabs>
  );
}
