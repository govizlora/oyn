"use client";
import React from "react";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsPanels,
  TabsTab,
} from "./controls/tabs";

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

export function FilmTabs({ radius = 18 }: { radius?: number }) {
  return (
    <Tabs defaultValue="Surface">
      <TabsList aria-label="Ceramic details" radius={radius}>
        {sections.map(({ tab }) => (
          <TabsTab key={tab} value={tab}>
            {tab}
          </TabsTab>
        ))}
      </TabsList>
      <TabsPanels>
        {sections.map(({ tab, title, text }) => (
          <TabsPanel key={tab} value={tab}>
            <h2>{title}</h2>
            <p>{text}</p>
          </TabsPanel>
        ))}
      </TabsPanels>
    </Tabs>
  );
}
