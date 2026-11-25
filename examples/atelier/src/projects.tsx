import { Button } from "@oyn/ui/button";
import {
  NavigationMenu,
  NavigationMenuLink,
  NavigationDisclosure,
} from "@oyn/ui/navigation-menu";
import { OynProvider } from "oyn/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
} from "react";
import { StoryNavigation } from "./components/story-navigation";
import type { Family, Example, Group } from "./components/catalog";
import "./projects.css";

const explorations = [
  ["Sculpted", "./"],
  ["Card Fantony", "./?view=card-fantony"],
  ["Ripple field", "./flip.html"],
  ["Quiet", "./?study=1"],
  ["Object library", "./?view=library"],
  ["Native button", "./surface.html"],
  ["Tabs", "./?view=tabs"],
  ["Relief logo", "./relief-logo.html"],
] as const;
const projects = [
  ["Component library", "./components.html"],
  ["Card", "./?view=card"],
  ...explorations,
] as const;

export function currentProject(url = new URL(location.href)) {
  if (url.searchParams.get("view") === "card-comparison") {
    url = new URL(url);
    url.searchParams.set("view", "card");
  }
  return (
    projects.find(([, href]) => {
      if (href === "./") return false;
      const target = new URL(href, url);
      return (
        target.pathname === url.pathname.replace(/\/index\.html$/, "/") &&
        [...target.searchParams].every(
          ([k, v]) => url.searchParams.get(k) === v,
        )
      );
    }) ?? explorations[0]
  );
}

const themeKey = "oyn.atelier.theme";
type Theme = "dark" | "light";
const contrastKey = "oyn.atelier.contrast";
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
function savedContrast() {
  const value = Number(readSetting(contrastKey));
  return Number.isInteger(value) && Math.abs(value) <= 100 ? value : 0;
}
function savedTheme(): Theme | null {
  const value = readSetting(themeKey);
  return value === "dark" || value === "light" ? value : null;
}
export function ProjectSwitch({
  overview,
  family,
  example,
  onStoryClick,
}: {
  overview?: Group;
  family?: Family;
  example?: Example;
  onStoryClick?: MouseEventHandler<HTMLElement>;
}) {
  const [choice, setChoice] = useState(savedTheme);
  const [contrast, setContrast] = useState(savedContrast);
  function changeContrast(next: number) {
    setContrast(next);
    saveSetting(contrastKey, String(next));
  }
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--preview-mix", Math.abs(contrast) + "%");
    root.setProperty(
      "--preview-target",
      contrast < 0 ? "light-dark(#fff, #000)" : "light-dark(#bbb, #444)",
    );
  }, [contrast]);
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
      if (e.key === contrastKey || e.key === null) setContrast(savedContrast());
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
  const menu = useRef<HTMLButtonElement>(null);
  function closeMenu() {
    setExpanded(false);
    menu.current?.focus({ preventScroll: true });
  }
  const current = currentProject();
  return (
    <OynProvider>
      <aside
        className="project-sidebar"
        onKeyDown={(event) => {
          if (event.key === "Escape" && expanded) closeMenu();
        }}
      >
        <Button
          type="button"
          ref={menu}
          className="project-menu"
          aria-expanded={expanded}
          aria-controls="project-navigation"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Close projects" : "Projects"} {expanded ? "×" : "☰"}
        </Button>
        <NavigationMenu
          orientation="vertical"
          id="project-navigation"
          className="project-switch"
          aria-label="Projects"
          onClick={(event) => {
            onStoryClick?.(event);
            if (expanded && event.defaultPrevented) closeMenu();
          }}
        >
          <StoryNavigation
            family={family}
            example={example}
            overview={overview}
            card={current[0] === "Card"}
            menuOpen={expanded}
          />
          <details
            className="project-group"
            open={!family && !overview && current[0] !== "Card"}
          >
            <NavigationDisclosure>Explorations</NavigationDisclosure>
            {explorations.map((project) => (
              <NavigationMenuLink
                key={project[1]}
                href={project[1]}
                current={project === current}
              >
                {project[0] === "Tabs" ? "Tabs study" : project[0]}
              </NavigationMenuLink>
            ))}
          </details>
          <section className="preview-controls" aria-label="Preview settings">
            <label htmlFor="preview-contrast">Background contrast</label>
            <input
              id="preview-contrast"
              type="range"
              min="-100"
              max="100"
              value={contrast}
              aria-valuetext={contrast ? contrast + "%" : "Default"}
              onChange={(e) => changeContrast(e.currentTarget.valueAsNumber)}
            />
            <Button
              type="button"
              aria-label="Reset background contrast"
              disabled={!contrast}
              onClick={() => changeContrast(0)}
            >
              Reset
            </Button>
          </section>
          <Button
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
          </Button>
        </NavigationMenu>
      </aside>
    </OynProvider>
  );
}
