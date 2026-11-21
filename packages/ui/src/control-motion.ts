import type { MotionNumber } from "@oyn/surface/adapters/motion";

/** Consumer-owned number source. No material writes or rendering work here. */
export function createControlMotion(view: Window, initial: number) {
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new Set<(value: number) => void>();
  let position = initial,
    destination = initial,
    velocity = 0,
    last = view.performance.now(),
    frame = 0;

  function advance(time: number) {
    const dt = Math.max(0, (time - last) / 1000);
    last = time;
    if (position === destination && velocity === 0) return;
    const previous = position;
    // Closed-form critical damping preserves position and velocity on reversal.
    const frequency = 30;
    const offset = position - destination;
    const momentum = velocity + frequency * offset;
    const decay = Math.exp(-frequency * dt);
    position = destination + (offset + momentum * dt) * decay;
    velocity = (velocity - frequency * momentum * dt) * decay;
    if (
      reduced.matches ||
      (Math.abs(position - destination) < 0.008 && Math.abs(velocity) < 0.14)
    ) {
      position = destination;
      velocity = 0;
    }
    if (position !== previous) listeners.forEach((notify) => notify(position));
  }
  function tick(time: number) {
    frame = 0;
    advance(time);
    if (position !== destination || velocity !== 0)
      frame = view.requestAnimationFrame(tick);
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
      advance(view.performance.now());
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
