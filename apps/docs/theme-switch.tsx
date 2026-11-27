"use client";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";
import { Tabs, TabsTab } from "@ui-sdk/react/tabs";
import { TabsList } from "@/components/ui/oyn/tabs";
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
export function ThemeSwitch() {
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
    const root = document.documentElement;
    if (preference) root.dataset.theme = preference.toLowerCase();
    return () => {
      delete root.dataset.theme;
    };
  }, [preference]);
  return (
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
      <TabsList aria-label="Color scheme" className="text-xs">
        {(Object.keys(themes) as Theme[]).map((value) => {
          const Icon = themes[value];
          return (
            <TabsTab
              key={value}
              value={value}
              aria-label={value}
              className="grid place-items-center p-1.5"
            >
              <Icon size={14} aria-hidden="true" />
            </TabsTab>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
