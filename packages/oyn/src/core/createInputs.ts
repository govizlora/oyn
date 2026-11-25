import type {
  PointerInput,
  PointerSnapshot,
  SurfaceInputs,
} from './types/input.js';

/** One lazy listener set per engine; last unsubscribe releases browser listeners. */
export function createInputs(win: Window) {
  const doc = win.document;
  let snapshot: PointerSnapshot = Object.freeze({
    position: null,
    inside: false,
    focused: doc.hasFocus(),
    visible: !doc.hidden,
  });
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  function publish(patch: Partial<PointerSnapshot>) {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    listeners.forEach((listener) => listener());
  }
  function start() {
    snapshot = Object.freeze({
      ...snapshot,
      focused: doc.hasFocus(),
      visible: !doc.hidden,
    });
    const move = (event: PointerEvent) =>
      publish({
        position: Object.freeze({ x: event.clientX, y: event.clientY }),
        inside: true,
      });
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) publish({ inside: false });
    };
    const blur = () => publish({ focused: false });
    const focus = () => publish({ focused: true });
    const visibility = () => publish({ visible: !doc.hidden });
    win.addEventListener('pointermove', move);
    doc.addEventListener('pointerout', leave);
    win.addEventListener('blur', blur);
    win.addEventListener('focus', focus);
    doc.addEventListener('visibilitychange', visibility);
    return () => {
      win.removeEventListener('pointermove', move);
      doc.removeEventListener('pointerout', leave);
      win.removeEventListener('blur', blur);
      win.removeEventListener('focus', focus);
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
      return () => {
        listeners.delete(subscription);
        if (!listeners.size) {
          stop?.();
          stop = undefined;
        }
      };
    },
  };
  return {
    inputs: { pointer } satisfies SurfaceInputs,
    dispose() {
      stop?.();
      stop = undefined;
      listeners.clear();
    },
  };
}
