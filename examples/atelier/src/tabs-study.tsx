import { useState } from "react";
import { Tabs, TabsTab, TabsPanel } from "@ui-sdk/react/tabs";
import { CeramicTabsList } from "@oyn/ui/tabs";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { CeramicTabsList as BaseList } from "@oyn/ui/base-ui/tabs";
import "./tabs-study.css";

const panels = {
  Overview:
    "Group related content in one place. Choose a tab to change the visible panel.",
  Material:
    "The track is recessed. The selected tab rests on a raised Ceramic surface.",
  Motion:
    "The indicator slides between tabs, or moves immediately when reduced motion is on.",
};

const items = Object.entries(panels).map(([label, description]) => ({
  label,
  value: label,
  panel: (
    <div className="tabs-example-panel">
      <strong>{label}</strong>
      <p>{description}</p>
    </div>
  ),
}));

export function TabsStudy() {
  const [vertical, setVertical] = useState(false);
  const [radius, setRadius] = useState(16);
  const [tone, setTone] = useState<"matching" | "inverse">("matching");
  const [value, setValue] = useState("Overview");
  const [baseUI, setBaseUI] = useState(
    () => new URLSearchParams(location.search).get("impl") === "base-ui",
  );
  const appearance = { radius, selectedTone: tone };
  const orientation = vertical ? "vertical" : "horizontal";
  return (
    <section className="tabs-study">
      <header>
        <h1>Tabs</h1>
        <fieldset className="tabs-implementation">
          <legend>Implementation</legend>
          {["UI SDK", "Base UI"].map((name) => (
            <label key={name}>
              <input
                type="radio"
                name="implementation"
                checked={baseUI === (name === "Base UI")}
                onChange={() => {
                  const url = new URL(location.href);
                  const useBaseUI = name === "Base UI";
                  if (useBaseUI) url.searchParams.set("impl", "base-ui");
                  else url.searchParams.delete("impl");
                  history.replaceState(history.state, "", url);
                  setBaseUI(useBaseUI);
                }}
              />{" "}
              {name}
            </label>
          ))}
        </fieldset>
      </header>
      <div className="tabs-workbench">
        <div className="tabs-preview">
          {baseUI ? (
            <BaseTabs.Root
              value={value}
              orientation={orientation}
              onValueChange={(v) => {
                if (typeof v === "string") setValue(v);
              }}
            >
              <BaseList aria-label="Component preview" {...appearance}>
                {items.map((item) => (
                  <BaseTabs.Tab key={item.value} value={item.value}>
                    {item.label}
                  </BaseTabs.Tab>
                ))}
              </BaseList>
              {items.map((item) => (
                <BaseTabs.Panel key={item.value} value={item.value}>
                  {item.panel}
                </BaseTabs.Panel>
              ))}
            </BaseTabs.Root>
          ) : (
            <Tabs
              value={value}
              onValueChange={(v) => {
                if (v !== null) setValue(v);
              }}
              orientation={orientation}
            >
              <CeramicTabsList aria-label="Component preview" {...appearance}>
                {items.map((item) => (
                  <TabsTab key={item.value} value={item.value}>
                    {item.label}
                  </TabsTab>
                ))}
              </CeramicTabsList>
              {items.map((item) => (
                <TabsPanel key={item.value} value={item.value}>
                  {item.panel}
                </TabsPanel>
              ))}
            </Tabs>
          )}
        </div>
        <aside aria-label="Tabs controls">
          <h2>Controls</h2>
          <label className="tabs-orientation">
            <input
              type="checkbox"
              checked={vertical}
              onChange={(e) => setVertical(e.currentTarget.checked)}
            />{" "}
            Vertical layout
          </label>
          <div className="tabs-radius-control">
            <label htmlFor="tabs-radius">Border radius</label>{" "}
            <output htmlFor="tabs-radius">{radius} px</output>
            <input
              id="tabs-radius"
              type="range"
              min="0"
              max="32"
              value={radius}
              onChange={(e) => setRadius(e.currentTarget.valueAsNumber)}
            />
          </div>
          <fieldset>
            <legend>Selected surface</legend>
            {(["matching", "inverse"] as const).map((v) => (
              <label key={v}>
                <input
                  type="radio"
                  name="selected-tone"
                  checked={v === tone}
                  onChange={() => setTone(v)}
                />
                {v === "matching" ? "Same color" : "Inverse"}
              </label>
            ))}
          </fieldset>
        </aside>
      </div>
    </section>
  );
}
