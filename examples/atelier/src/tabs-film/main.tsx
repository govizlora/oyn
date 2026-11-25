import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OynProvider } from "oyn/react";
import { FilmTabs } from "./FilmTabs";
import "./stage.css";

function TabsFilm() {
  const [logo, setLogo] = useState<"64u" | "88u">("64u");
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("inspect")) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    void import("./inspect").then(({ inspectTabFrames }) => {
      if (!disposed) stop = inspectTabFrames();
    });
    return () => {
      disposed = true;
      stop?.();
    };
  }, []);
  useEffect(() => {
    function onStageShortcut(event: KeyboardEvent) {
      if (
        (event.code !== "KeyD" && event.code !== "KeyL") ||
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          event.target.closest("input, textarea, select"))
      )
        return;
      // Recording shortcuts change the stage, not the focused tab.
      if (
        event.target instanceof HTMLElement &&
        event.target.matches('[role="tab"]')
      )
        event.target.blur();
      if (event.code === "KeyL") {
        setLogo((current) => (current === "64u" ? "88u" : "64u"));
        return;
      }
      const style = document.documentElement.style;
      const current =
        style.colorScheme ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      style.colorScheme = current === "dark" ? "light" : "dark";
    }
    window.addEventListener("keydown", onStageShortcut);
    return () => window.removeEventListener("keydown", onStageShortcut);
  }, []);

  return (
    <main className="frame" aria-label="OYN Tabs">
      <div className="composition">
        <span
          className="wordmark"
          data-logo={logo}
          role="img"
          aria-label="OYN"
        />
        <FilmTabs />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <OynProvider>
    <TabsFilm />
  </OynProvider>,
);
