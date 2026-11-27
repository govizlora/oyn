import { Tabs, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { TabsList, TabsPanels } from "@/components/ui/oyn/tabs";

export function TabsDemo() {
  return (
    <Tabs defaultValue="surface" style={{ width: "min(24rem, 100%)" }}>
      <TabsList aria-label="Ceramic details">
        <TabsTab value="surface">Surface</TabsTab>
        <TabsTab value="light">Light</TabsTab>
        <TabsTab value="motion">Motion</TabsTab>
      </TabsList>
      <TabsPanels style={{ minHeight: "7rem" }}>
        <TabsPanel value="surface">
          Tab in. Switch with the arrow keys.
        </TabsPanel>
        <TabsPanel value="light">The light follows your pointer.</TabsPanel>
        <TabsPanel value="motion">The tab glides as the words fade.</TabsPanel>
      </TabsPanels>
    </Tabs>
  );
}
