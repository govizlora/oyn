import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@oyn/ui/tabs";
import "./tabs-study.css";

const panels = {
  Overview: "A recessed track with one raised selection.",
  Material:
    "Both surfaces use standard Ceramic. Inverse changes the pigment, not the lighting.",
  Motion:
    "The selection slides to the active tab. Reduced motion switches instantly.",
};

export function TabsStudy() {
  const [radius, setRadius] = useState(16);
  const [tone, setTone] = useState<"matching" | "inverse">("matching");
  return (
    <section className="tabs-study">
      <header>
        <small>COMPONENTS / 01</small>
        <h1>Tabs</h1>
        <p>
          One panel at a time. Click a tab or use the arrow keys to switch
          views.
        </p>
      </header>
      <div className="tabs-workbench">
        <div className="tabs-preview">
          <small>INTERACTIVE PREVIEW</small>
          <Tabs defaultValue="Overview">
            <TabsList
              aria-label="Component preview"
              radius={radius}
              selectedTone={tone}
            >
              {Object.keys(panels).map((label) => (
                <TabsTrigger key={label} value={label}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(panels).map(([label, text]) => (
              <TabsContent key={label} value={label}>
                <h2>{label}</h2>
                <p>{text}</p>
              </TabsContent>
            ))}
          </Tabs>
        </div>
        <aside aria-label="Tabs controls">
          <h2>Controls</h2>
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
