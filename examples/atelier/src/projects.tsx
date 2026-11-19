import { useLayoutEffect, useState } from "react";
import "./projects.css";

const projects = [
  ["Sculpted", "./"],
  ["Ripple field", "./flip.html"],
  ["Geometry lab", "./?view=solids"],
  ["Card", "./?view=card"],
  ["Shadow lab", "./?view=shadow-lab"],
  ["Quiet", "./?study=1"],
  ["Air", "./?study=2"],
  ["Play", "./?study=3"],
  ["Object library", "./?view=library"],
  ["Native button", "./surface.html"],
] as const;

export function currentProject(url = new URL(location.href)) {
  if (url.searchParams.get("view") === "card-comparison") {
    url = new URL(url);
    url.searchParams.set("view", "card");
  }
  return (
    projects.slice(1).find(([, href]) => {
      const target = new URL(href, url);
      return (
        target.pathname === url.pathname.replace(/\/index\.html$/, "/") &&
        [...target.searchParams].every(
          ([k, v]) => url.searchParams.get(k) === v,
        )
      );
    }) ?? projects[0]
  );
}

const themeKey = "oyn.atelier.theme";
type Theme = "dark" | "light";
const brightnessKey = "oyn.atelier.brightness";
function readSetting(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Apply in memory. */
  }
}
function savedBrightness() {
  const value = Number(readSetting(brightnessKey));
  return Number.isInteger(value) && Math.abs(value) <= 100 ? value : 0;
}
function savedTheme(): Theme | null {
  const value = readSetting(themeKey);
  return value === "dark" || value === "light" ? value : null;
}
export function ProjectSwitch() {
  const [choice, setChoice] = useState(savedTheme);
  const [brightness, setBrightness] = useState(savedBrightness);
  function changeBrightness(next: number) {
    setBrightness(next);
    saveSetting(brightnessKey, String(next));
  }
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--preview-mix", Math.abs(brightness) + "%");
    root.setProperty(
      "--preview-target",
      brightness < 0 ? "light-dark(#bbb, #000)" : "light-dark(#fff, #444)",
    );
  }, [brightness]);
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const dark = choice ? choice === "dark" : systemDark;
  useLayoutEffect(() => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);
  useLayoutEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(media.matches);
    const storage = (e: StorageEvent) => {
      if (e.key === brightnessKey || e.key === null)
        setBrightness(savedBrightness());
      if (e.key === themeKey || e.key === null) setChoice(savedTheme());
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  function toggle() {
    const next = dark ? "light" : "dark";
    setChoice(next);
    saveSetting(themeKey, next);
  }

  const [expanded, setExpanded] = useState(false);
  const current = currentProject();
  return (
    <aside className="project-sidebar">
      <button
        type="button"
        className="project-menu"
        aria-expanded={expanded}
        aria-controls="project-navigation"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Close projects" : "Projects"} {expanded ? "×" : "☰"}
      </button>
      <nav
        id="project-navigation"
        className="project-switch"
        aria-label="Projects"
      >
        <div>
          {projects.map((project) => (
            <a
              key={project[1]}
              href={project[1]}
              aria-current={project === current ? "page" : undefined}
            >
              {project[0]}
            </a>
          ))}
        </div>
        <section className="preview-controls" aria-label="Preview settings">
          <label htmlFor="preview-brightness">Background brightness</label>
          <input
            id="preview-brightness"
            type="range"
            min="-100"
            max="100"
            value={brightness}
            aria-valuetext={brightness ? brightness + "%" : "Default"}
            onChange={(e) => changeBrightness(e.currentTarget.valueAsNumber)}
          />
          <button
            type="button"
            aria-label="Reset background brightness"
            disabled={!brightness}
            onClick={() => changeBrightness(0)}
          >
            Reset
          </button>
        </section>
        <button
          type="button"
          className="theme-switch"
          aria-label="Dark mode"
          aria-pressed={dark}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggle}
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {dark ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
              </>
            ) : (
              <path d="M20.5 14A8.6 8.6 0 0 1 10 3.5 8.7 8.7 0 1 0 20.5 14Z" />
            )}
          </svg>
        </button>
      </nav>
    </aside>
  );
}
