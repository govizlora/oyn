import type { MotionNumber } from "oyn/adapters/motion";

const durationMs = 150;

/** Sample an instant-push ease-out, independent of travel distance or frame rate. */
export function sampleControlMotion(
  origin: number,
  target: number,
  elapsed: number,
) {
  if (elapsed <= 0) return origin;
  if (elapsed >= durationMs) return target;
  return target + (origin - target) * (1 - elapsed / durationMs) ** 2;
}

/** Consumer-owned number source. No material writes or rendering work here. */
export function createControlMotion(view: Window, initial: number) {
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new Set<(value: number) => void>();
  let position = initial,
    destination = initial,
    origin = initial,
    started = 0,
    frame = 0;

  function advance(time: number) {
    const previous = position;
    position = reduced.matches
      ? destination
      : sampleControlMotion(origin, destination, time - started);
    if (position !== previous) listeners.forEach((notify) => notify(position));
  }
  function tick(time: number) {
    frame = 0;
    advance(time);
    if (position !== destination) frame = view.requestAnimationFrame(tick);
  }
  function snapIfReduced() {
    if (!reduced.matches) return;
    view.cancelAnimationFrame(frame);
    frame = 0;
    advance(view.performance.now());
  }
  reduced.addEventListener("change", snapIfReduced);
  return {
    get: () => position,
    on(_event: "change", listener: (value: number) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setTarget(value: number) {
      if (value === destination) return;
      const now = view.performance.now();
      if (frame) advance(now);
      origin = position;
      started = now;
      destination = value;
      if (reduced.matches) snapIfReduced();
      else if (!frame) frame = view.requestAnimationFrame(tick);
    },
    dispose() {
      view.cancelAnimationFrame(frame);
      reduced.removeEventListener("change", snapIfReduced);
      listeners.clear();
    },
  } satisfies MotionNumber & {
    setTarget(value: number): void;
    dispose(): void;
  };
}
