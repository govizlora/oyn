import { ProjectSwitch, currentProject } from "./projects";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider } from "@oyn/surface";
import { QuietStudy } from "./studies";
import { AirStudy, PlaygroundStudy } from "./kinetic-studies";
import { ObjectLibrary, type LibraryLocation } from "./library";
import { objects, rooms } from "./library/registry";
import { ShadowLab } from "./shadow-lab";
import { Card } from "./card";
import { SolidStudy } from "./solid-study";
import { SculptedStudy } from "./sculpted-study";
import "./style.css";
import "./desktop.css";
import "./library/library.css";
import "./kinetic.css";
import "./sculpted.css";

const studies = { Quiet: QuietStudy, Air: AirStudy, Play: PlaygroundStudy };
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
  const Study =
    project === "Quiet" || project === "Air" || project === "Play"
      ? studies[project]
      : undefined;
  return (
    <>
      <ProjectSwitch />
      <main
        aria-label="Oyn interactive material studies"
        className={
          "atelier " +
          (Study
            ? ""
            : project === "Object library"
              ? "atelier-library"
              : "atelier-sculpture")
        }
        data-study={
          Study ? Object.values(studies).indexOf(Study) + 1 : undefined
        }
      >
        <SurfaceProvider>
          {Study ? (
            <div className="composition">
              <Study />
            </div>
          ) : project === "Object library" ? (
            <ObjectLibrary
              key={room + ":" + (object ?? "")}
              room={room}
              object={object}
              navigate={library}
            />
          ) : project === "Shadow lab" ? (
            <ShadowLab />
          ) : project === "Geometry lab" ? (
            <SolidStudy />
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
