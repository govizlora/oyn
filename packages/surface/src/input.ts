/** Input facts only. No light, hover effect, fallback position or return animation. */
export type Point = Readonly<{ x: number; y: number }>;
export type PointerSnapshot = Readonly<{
  position: Point | null;
  inside: boolean;
  focused: boolean;
  visible: boolean;
}>;
export type PointerInput = Readonly<{
  getSnapshot(): PointerSnapshot;
  subscribe(listener: () => void): () => void;
}>;
export type SurfaceInputs = Readonly<{ pointer: PointerInput }>;

/** One lazy listener set per engine; last unsubscribe releases browser listeners. */
export function createInputs(win: Window) {
  const doc = win.document;
  let snapshot: PointerSnapshot = Object.freeze({ position: null, inside: false, focused: doc.hasFocus(), visible: !doc.hidden });
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  function publish(patch: Partial<PointerSnapshot>) {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    listeners.forEach(listener => listener());
  }
  function start() {
    snapshot = Object.freeze({ ...snapshot, focused: doc.hasFocus(), visible: !doc.hidden });
    const move = (event: PointerEvent) => publish({ position: Object.freeze({ x: event.clientX, y: event.clientY }), inside: true });
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) publish({ inside: false }); };
    const blur = () => publish({ focused: false });
    const focus = () => publish({ focused: true });
    const visibility = () => publish({ visible: !doc.hidden });
    win.addEventListener('pointermove', move);
    doc.addEventListener('pointerout', leave);
    win.addEventListener('blur', blur); win.addEventListener('focus', focus);
    doc.addEventListener('visibilitychange', visibility);
    return () => {
      win.removeEventListener('pointermove', move); doc.removeEventListener('pointerout', leave);
      win.removeEventListener('blur', blur); win.removeEventListener('focus', focus);
      doc.removeEventListener('visibilitychange', visibility);
    };
  }
  const pointer: PointerInput = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      // Wrap to give every subscription its own lifetime, even for the same callback.
      const subscription = () => listener();
      listeners.add(subscription);
      if (!stop) stop = start();
      return () => { listeners.delete(subscription); if (!listeners.size) { stop?.(); stop = undefined; } };
    },
  };
  return { inputs: { pointer } satisfies SurfaceInputs, dispose() { stop?.(); stop = undefined; listeners.clear(); } };
}
