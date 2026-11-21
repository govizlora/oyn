import { StrictMode, useEffect, useState, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider } from "@oyn/surface";
import { ProjectSwitch } from "../projects";
import { families, readStory, storyHref } from "./catalog";
import { Overview } from "./overview";
import "./stories.css";

const stories = families.flatMap((family) =>
  family.examples.map((example) => ({
    example,
    href: storyHref(family.id, example.id),
    label: family.name + " · " + example.title,
  })),
);

function App() {
  const [{ family, example }, setRoute] = useState(readStory);
  const index = stories.findIndex((entry) => entry.example === example);
  useEffect(() => {
    const update = () => setRoute(readStory());
    addEventListener("popstate", update);
    return () => removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    document.title =
      (family ? family.name + " · " + example?.title : "UI Components") +
      " · OYN";
  }, [family, example]);
  function openStory(event: MouseEvent<HTMLElement>) {
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[data-story]",
    );
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    const disclosure = link.closest(".story-family")?.querySelector("details");
    if (disclosure) disclosure.open = true;
    if (link.href !== location.href) {
      history.pushState(null, "", link.href);
      setRoute(readStory());
      window.scrollTo(0, 0);
    }
  }
  return (
    <>
      <ProjectSwitch
        family={family}
        example={example}
        onStoryClick={openStory}
      />
      <main className="component-workspace" onClick={openStory}>
        {family && example ? (
          <article className="specimen">
            <header>
              <h1>{family.name}</h1>
              <div className="specimen-toolbar">
                <h2>{example.title}</h2>
                <a
                  href={
                    "./recipe-source/" +
                    family.id +
                    "/" +
                    example.id +
                    ".tsx.txt"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  React source ↗
                </a>
                <a
                  href={"https://ui-sdk.dev/docs/react/components/" + family.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  UI SDK ↗
                </a>
              </div>
            </header>
            <iframe
              key={family.id + "/" + example.id}
              className="specimen-stage"
              title={family.name + " · " + example.title}
              src={
                "./component-preview.html?" +
                new URLSearchParams({
                  component: family.id,
                  example: example.id,
                })
              }
            />
            <footer className="specimen-caption">
              <p>{example.caption}</p>
              <nav aria-label="Browse examples">
                {stories[index - 1] && (
                  <a
                    data-story
                    rel="prev"
                    href={stories[index - 1].href}
                    title={stories[index - 1].label}
                  >
                    ← Previous example
                  </a>
                )}
                {stories[index + 1] && (
                  <a
                    data-story
                    rel="next"
                    href={stories[index + 1].href}
                    title={stories[index + 1].label}
                  >
                    Next example →
                  </a>
                )}
              </nav>
            </footer>
          </article>
        ) : (
          <SurfaceProvider>
            <Overview />
          </SurfaceProvider>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
