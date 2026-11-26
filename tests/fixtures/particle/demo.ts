import { createEngine, createSurface } from "@oyn/core";
import { particle } from "@oyn/materials";

const host = document.querySelector<HTMLElement>(".cloud")!;
const action = document.querySelector("button")!;
const engine = createEngine();
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const start = performance.now();
const color = "#a2adcf";
const surface = createSurface(engine, { material: particle, props: { color } });
let unbind = surface.bind(host);
engine.start();
let flight: number | undefined;
let raf = 0;

function render(now: number) {
  cancelAnimationFrame(raf);
  if (host.hidden) return;
  const exit =
    flight === undefined
      ? 0
      : motion.matches
        ? 1
        : Math.min(1, (now - flight) / 1750);
  if (exit >= 1) {
    unbind?.();
    host.hidden = true;
    action.textContent = "Replay ↺";
    return;
  }
  surface.update({
    color,
    time: motion.matches ? 0 : (now - start) / 1000,
    exit,
  });
  if (!motion.matches && !document.hidden && !engine.failed)
    raf = requestAnimationFrame(render);
}
action.onclick = () => {
  if (host.hidden) {
    flight = undefined;
    host.hidden = false;
    unbind = surface.bind(host);
    action.textContent = "Disperse ↗";
  } else if (flight === undefined) flight = performance.now();
  render(performance.now());
};
const refresh = () => render(performance.now());
motion.addEventListener("change", refresh);
document.addEventListener("visibilitychange", refresh);
refresh();
