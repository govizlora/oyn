/** App-owned input source. The cursor and material lighting read one snapshot. */
export function createStudyPointer(win) {
  const doc = win.document;
  const mouse = win.matchMedia("(any-hover: hover) and (any-pointer: fine)");
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  const center = () => ({ x: win.innerWidth / 2, y: win.innerHeight / 2 });
  let snapshot = {
    position: center(),
    inside: false,
    focused: doc.hasFocus(),
    visible: !doc.hidden,
  };
  let engaged = false;
  let mouseSeen = false;
  let touchId;
  let elapsed = 0;
  let previous;
  let raf = 0;
  let stop;
  const listeners = new Set();
  const showCursor = () => !mouse.matches && !mouseSeen;
  const publish = (patch) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const cancel = () => {
    win.cancelAnimationFrame(raf);
    raf = 0;
    previous = undefined;
  };
  const frame = (now) => {
    raf = 0;
    if (previous !== undefined) elapsed += now - previous;
    previous = now;
    const t = elapsed / 1000;
    const ease = 1 - Math.exp(-t / 3);
    const origin = center();
    publish({
      position: {
        x:
          origin.x +
          Math.min(win.innerWidth * 0.22, 130) * Math.sin(t * 0.22) * ease,
        y:
          origin.y +
          Math.min(win.innerHeight * 0.1, 65) * Math.sin(t * 0.44) * ease,
      },
    });
    if (canAnimate()) raf = win.requestAnimationFrame(frame);
  };
  const canAnimate = () =>
    listeners.size > 0 &&
    !engaged &&
    showCursor() &&
    !reduced.matches &&
    !doc.hidden;
  const schedule = () => {
    cancel();
    if (canAnimate()) raf = win.requestAnimationFrame(frame);
  };
  const take = (x, y) => {
    engaged = true;
    cancel();
    publish({ position: { x, y }, inside: true });
  };
  function start() {
    const controller = new AbortController();
    const options = { signal: controller.signal, passive: true };
    const pointer = (event) => {
      // Touch Events continue during native scrolling after pointercancel.
      if (event.pointerType === "touch" || !event.isPrimary) return;
      if (event.pointerType === "mouse") mouseSeen = true;
      take(event.clientX, event.clientY);
    };
    const touch = (event) => {
      if (touchId === undefined && event.type === "touchstart")
        touchId = event.changedTouches[0]?.identifier;
      const point = Array.from(event.touches).find(
        (item) => item.identifier === touchId,
      );
      if (point) take(point.clientX, point.clientY);
    };
    const endTouch = (event) => {
      if (
        Array.from(event.changedTouches).some(
          (item) => item.identifier === touchId,
        )
      )
        touchId = undefined;
    };
    const preference = () => {
      publish({});
      schedule();
    };
    win.addEventListener("pointerdown", pointer, options);
    win.addEventListener("pointermove", pointer, options);
    win.addEventListener("touchstart", touch, options);
    win.addEventListener("touchmove", touch, options);
    win.addEventListener("touchend", endTouch, options);
    win.addEventListener("touchcancel", endTouch, options);
    win.addEventListener(
      "pointerout",
      (event) => {
        if (!event.relatedTarget) publish({ inside: false });
      },
      options,
    );
    win.addEventListener("blur", () => publish({ focused: false }), options);
    win.addEventListener("focus", () => publish({ focused: true }), options);
    doc.addEventListener(
      "visibilitychange",
      () => {
        publish({ visible: !doc.hidden });
        schedule();
      },
      options,
    );
    win.addEventListener(
      "resize",
      () => {
        if (!engaged) {
          elapsed = 0;
          publish({ position: center() });
          schedule();
        }
      },
      options,
    );
    mouse.addEventListener("change", preference, options);
    reduced.addEventListener("change", preference, options);
    publish({ focused: doc.hasFocus(), visible: !doc.hidden });
    schedule();
    return () => {
      controller.abort();
      cancel();
      touchId = undefined;
    };
  }
  const inputs = {
    pointer: {
      getSnapshot: () => snapshot,
      subscribe(listener) {
        const notify = () => listener();
        listeners.add(notify);
        if (!stop) stop = start();
        return () => {
          listeners.delete(notify);
          if (!listeners.size) {
            stop?.();
            stop = undefined;
          }
        };
      },
    },
  };
  return { inputs, showCursor };
}
