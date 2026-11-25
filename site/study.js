import { createEngine, createSurface } from "oyn";
import { ceramic } from "oyn/materials/ceramic";

import { createStudyPointer } from "./pointer.js";

const pointer = createStudyPointer(window);
const cursor = document.querySelector(".study-cursor");
const writeCursor = () => {
  const { position, visible } = pointer.inputs.pointer.getSnapshot();
  cursor.hidden = !pointer.showCursor() || !visible;
  cursor.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
};
let unsubscribeCursor = pointer.inputs.pointer.subscribe(writeCursor);
writeCursor();
const engine = createEngine();
const controls = document.querySelector("fieldset");
const appearance = document.querySelector("select");
controls.hidden = appearance.parentElement.hidden = false;
appearance.onchange = () => {
  document.documentElement.style.colorScheme = appearance.value;
};

const inputSurfaces = [...controls.querySelectorAll("input")].map((input) => {
  const surface = createSurface(engine, {
    material: ceramic,
    props: { elevation: 0, maxElevation: 8 },
  });
  surface.bind(input.parentElement);
  return { input, surface };
});
const panel = document.querySelector("article");
createSurface(engine, { material: ceramic, props: { elevation: 8 } }).bind(
  panel,
);
function selectStudy() {
  for (const { input, surface } of inputSurfaces) {
    document.getElementById(input.value).hidden = !input.checked;
    surface.update({ elevation: input.checked ? 8 : 0, maxElevation: 8 });
  }
}
controls.onchange = selectStudy;
selectStudy();
engine.start(false, pointer.inputs);

// Release page-owned work without destroying state when entering the back/forward cache.
window.addEventListener("pagehide", () => {
  engine.stop();
  unsubscribeCursor();
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  unsubscribeCursor = pointer.inputs.pointer.subscribe(writeCursor);
  writeCursor();
  engine.start(false, pointer.inputs);
});
