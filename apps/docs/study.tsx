"use client";
import React, { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTab } from "./controls/tabs";
import { FilmTabs } from "./FilmTabs";
const specimenRadius = 32;
const themes = { Light: SunIcon, Dark: MoonIcon } as const;
type Theme = keyof typeof themes;
const getSystem = () => matchMedia("(prefers-color-scheme: dark)");
const readSystem = (): Theme => (getSystem().matches ? "Dark" : "Light");
const watchSystem = (notify: () => void) => {
  const system = getSystem();
  system.addEventListener("change", notify);
  return () => system.removeEventListener("change", notify);
};
const storageKey = "oyn.site.theme";
export function Study() {
  const [preference, setPreference] = useState<Theme | null>(null);
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "Light" || saved === "Dark") setPreference(saved);
    } catch {}
  }, []);
  const systemTheme = useSyncExternalStore(
    watchSystem,
    readSystem,
    (): Theme => "Light",
  );
  useLayoutEffect(() => {
    const style = document.documentElement.style;
    if (preference) style.colorScheme = preference.toLowerCase();
    return () => {
      style.removeProperty("color-scheme");
    };
  }, [preference]);
  return (
    <>
      <main aria-label="Ceramic Tabs study">
        <div
          className="specimen"
          style={
            {
              "--specimen-radius": `${specimenRadius}px`,
            } as React.CSSProperties
          }
        >
          <FilmTabs radius={specimenRadius} />
        </div>
      </main>
      <footer>
        <Tabs<Theme>
          value={preference ?? systemTheme}
          onValueChange={(next) => {
            if (!next) return;
            setPreference(next);
            try {
              localStorage.setItem(storageKey, next);
            } catch {
              /* The manual choice still applies for this visit. */
            }
          }}
        >
          <TabsList aria-label="Color scheme" radius={15}>
            {(Object.keys(themes) as Theme[]).map((value) => {
              const Icon = themes[value];
              return (
                <TabsTab key={value} value={value}>
                  <Icon size={14} aria-hidden="true" />
                  {value}
                </TabsTab>
              );
            })}
          </TabsList>
        </Tabs>
      </footer>
    </>
  );
}
