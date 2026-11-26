import React, {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Sun, Moon } from "lucide-react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { OynProvider } from "@oyn/react";
import { Button } from "./controls/button";
import { Tabs, TabsList, TabsTab } from "./controls/tabs";
import { FilmTabs } from "./FilmTabs";

import { createStudyPointer } from "./pointer.js";

const studyPointer = createStudyPointer(window);

function StudyCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const write = () => {
      const node = ref.current!;
      const { position, visible } = studyPointer.inputs.pointer.getSnapshot();
      node.hidden = !studyPointer.showCursor() || !visible;
      if (position)
        node.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    };
    const unsubscribe = studyPointer.inputs.pointer.subscribe(write);
    write();
    return unsubscribe;
  }, []);
  return (
    <div className="study-cursor-layer" aria-hidden="true">
      <div ref={ref} className="study-cursor">
        <svg viewBox="0 0 20 28" focusable="false">
          <path
            d="M1 1v21l5.1-5.1 4.2 9.1 4-1.9-4.2-8.9H18Z"
            fill="#111"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

const xProfile = "https://x.com/Govizlora";
const profiles = [
  {
    name: "GitHub",
    label: "OYN GitHub repository",
    href: "https://github.com/govizlora/oyn",
    path: "M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.42.11-2.97 0 0 .94-.3 3.1 1.16a10.8 10.8 0 0 1 5.64 0c2.15-1.46 3.09-1.16 3.09-1.16.61 1.55.23 2.69.11 2.97.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z",
  },
  {
    name: "X",
    label: "X profile",
    href: xProfile,
    path: "M18.9 2h3.3l-7.2 8.25L23.5 22h-6.65l-5.2-6.8L5.7 22H2.4l7.7-8.83L.6 2h6.82l4.7 6.23L18.9 2Zm-1.16 17.92h1.83L6.43 3.97H4.47l13.27 15.95Z",
  },
  {
    name: "Twitter",
    label: "Twitter profile",
    href: xProfile,
    path: "M23.95 4.57a10 10 0 0 1-2.83.78 4.93 4.93 0 0 0 2.16-2.72 9.97 9.97 0 0 1-3.13 1.2 4.92 4.92 0 0 0-8.39 4.49A13.98 13.98 0 0 1 1.61 3.18a4.92 4.92 0 0 0 1.52 6.57 4.9 4.9 0 0 1-2.23-.62v.06a4.92 4.92 0 0 0 3.95 4.83 4.97 4.97 0 0 1-2.22.08 4.93 4.93 0 0 0 4.6 3.42A9.87 9.87 0 0 1 0 19.56a13.92 13.92 0 0 0 7.55 2.21c9.06 0 14.01-7.5 14.01-14.01l-.02-.64a10 10 0 0 0 2.46-2.55Z",
  },
];

const specimenRadius = 32;
const themes = { Light: Sun, Dark: Moon } as const;
type Theme = keyof typeof themes;
const system = matchMedia("(prefers-color-scheme: dark)");
const readSystem = (): Theme => (system.matches ? "Dark" : "Light");
const watchSystem = (notify: () => void) => {
  system.addEventListener("change", notify);
  return () => system.removeEventListener("change", notify);
};
const storageKey = "oyn.site.theme";
function Study() {
  const [preference, setPreference] = useState<Theme | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "Light" || saved === "Dark" ? saved : null;
    } catch {
      return null;
    } // Storage may be blocked in a private preview.
  });
  const systemTheme = useSyncExternalStore(watchSystem, readSystem);
  useLayoutEffect(() => {
    const style = document.documentElement.style;
    if (preference) style.colorScheme = preference.toLowerCase();
    return () => {
      style.removeProperty("color-scheme");
    };
  }, [preference]);
  return (
    <>
      <header>
        <span className="signature">
          <span role="img" aria-label="OYN" className="logo" />
          <a href="/about/" title="About OYN (work in progress)">
            WIP
          </a>
        </span>
        <nav aria-label="Project links">
          {profiles.map(({ name, label, href, path }) => (
            <Button
              key={name}
              variant="ghost"
              render={<a href={href} />}
              aria-label={label}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={path} />
              </svg>
              {name}
            </Button>
          ))}
        </nav>
      </header>
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
                  <Icon size={14} strokeWidth={1.6} aria-hidden="true" />
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
const root = createRoot(document.getElementById("study")!);
function render(visible: boolean) {
  root.render(
    <React.Activity mode={visible ? "visible" : "hidden"}>
      <OynProvider inputs={studyPointer.inputs}>
        <StudyCursor />
        <Study />
      </OynProvider>
    </React.Activity>,
  );
}
render(true);
window.addEventListener("pagehide", () => flushSync(() => render(false)));
window.addEventListener("pageshow", (event) => {
  if (event.persisted) render(true);
});
