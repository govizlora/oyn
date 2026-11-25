import { createEngine, createSurface } from "oyn";
import { ceramic } from "oyn/materials/ceramic";

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
engine.start();
