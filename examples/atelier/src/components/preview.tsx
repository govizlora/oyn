import {
  StrictMode,
  Suspense,
  lazy,
  useCallback,
  useState,
  type ComponentType,
} from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider } from "@oyn/surface";
import { StoryLog } from "./log";
import "./recipe-layout.css";
import "./preview.css";

const params = new URLSearchParams(location.search);
const family = params.get("component");
const example = params.get("example");
const modules = import.meta.glob<{ Example: ComponentType }>(
  "./generated/*/*.tsx",
);
const load = modules[`./generated/${family}/${example}.tsx`];
const Example = load && lazy(async () => ({ default: (await load()).Example }));

function Preview() {
  const [message, setMessage] = useState("");
  const log = useCallback((value: string) => {
    console.info(value);
    setMessage(value);
  }, []);
  return Example ? (
    <SurfaceProvider>
      <section
        className="oyn-ui specimen-content"
        aria-label="Component preview"
        data-example={family + "/" + example}
      >
        <Suspense
          fallback={
            <p role="status" data-preview-loading="">
              Loading example…
            </p>
          }
        >
          <StoryLog value={log}>
            <Example />
          </StoryLog>
        </Suspense>
      </section>
      <output className="story-event" role="status">
        {message}
      </output>
    </SurfaceProvider>
  ) : (
    <p role="status">Unknown example.</p>
  );
}
document.title = [family, example, "OYN"].join(" · ");
createRoot(document.getElementById("preview")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
