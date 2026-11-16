// One application time source, never a renderer. Numeric material updates wake
// Surface's existing scheduler. No subscribers => no timer or policy listeners.
const subscribers = new Set<(seconds: number) => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let media: MediaQueryList | undefined;
let last = 0;
function reconcile() {
  const run = subscribers.size > 0 && !document.hidden && !media?.matches;
  if (!run && timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
  if (run && timer === undefined) {
    last = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      subscribers.forEach((update) => update(dt));
    }, 1000 / 30);
  }
}
export function followMotion(update: (seconds: number) => void) {
  if (!subscribers.size) {
    media = matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', reconcile);
    document.addEventListener('visibilitychange', reconcile);
  }
  subscribers.add(update);
  reconcile();
  return () => {
    subscribers.delete(update);
    reconcile();
    if (!subscribers.size) {
      media?.removeEventListener('change', reconcile);
      media = undefined;
      document.removeEventListener('visibilitychange', reconcile);
    }
  };
}
