import { ProjectSwitch, currentProject } from "./projects";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider } from "@oyn/surface";
import { QuietStudy } from "./studies";
import { ObjectLibrary, type LibraryLocation } from "./library";
import { objects, rooms } from "./library/registry";
import { TabsStudy } from "./tabs-study";
import { Card } from "./card";
import { SculptedStudy } from "./sculpted-study";
import "./style.css";
import "./desktop.css";
import "./library/library.css";
import "./kinetic.css";
import "./sculpted.css";

function readLocation() {
  const url = new URL(location.href);
  const [project] = currentProject(url);
  const requested = url.searchParams.get("room") ?? "controls";
  const object = objects.find(
    (spec) => spec.id === url.searchParams.get("object"),
  );
  return {
    project,
    room:
      object?.room ??
      (rooms.some((r) => r.id === requested) ||
      ["all", "picked"].includes(requested)
        ? requested
        : "controls"),
    object: object?.id,
  };
}
function App() {
  const [{ project, room, object }, setRoute] = useState(readLocation);
  useEffect(() => {
    const pop = () => setRoute(readLocation());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    document.title = "Oyn — " + project;
  }, [project]);
  const library = ({ room, object }: LibraryLocation) => {
    const url = new URL(location.href);
    url.searchParams.set("room", room);
    if (object) url.searchParams.set("object", object);
    else url.searchParams.delete("object");
    history.pushState({}, "", url);
    setRoute(readLocation());
    window.scrollTo(0, 0);
  };
  const quiet = project === "Quiet";
  return (
    <>
      <ProjectSwitch />
      <main
        aria-label="Oyn interactive material studies"
        className={
          "atelier " +
          (quiet
            ? ""
            : project === "Object library"
              ? "atelier-library"
              : "atelier-sculpture")
        }
      >
        <SurfaceProvider>
          {quiet ? (
            <div className="composition">
              <QuietStudy />
            </div>
          ) : project === "Object library" ? (
            <ObjectLibrary
              key={room + ":" + (object ?? "")}
              room={room}
              object={object}
              navigate={library}
            />
          ) : project === "Tabs" ? (
            <TabsStudy />
          ) : project === "Card" ? (
            <Card />
          ) : (
            <SculptedStudy />
          )}
        </SurfaceProvider>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
