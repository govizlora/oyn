import { StrictMode, createElement, createRef, useMemo, type Ref } from 'react';
import { createRoot } from 'react-dom/client';
import { OynProvider, useMaterial } from 'oyn/react';
import { ceramic } from 'oyn/materials/ceramic';

export async function checkRefLifecycle() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const counts = { a: 0, aCleanup: 0, b: 0, bCleanup: 0 };
  const a = (node: HTMLButtonElement | null) => {
    if (node) counts.a++;
    return () => { counts.aCleanup++; };
  };
  const b = (node: HTMLButtonElement | null) => {
    if (node) counts.b++;
    return () => { counts.bCleanup++; };
  };
  const objectRef = createRef<HTMLButtonElement>();
  function Probe({ forwardedRef, color }: { forwardedRef: Ref<HTMLButtonElement>; color: string }) {
    const ref = useMaterial({ material: ceramic, props: { color, elevation: 4 } });
    const composed = useMemo(() => (node: HTMLButtonElement | null) => {
      const releaseSurface = ref(node);
      const cleanup = typeof forwardedRef === "function" ? forwardedRef(node) : undefined;
      if (forwardedRef && typeof forwardedRef !== "function") forwardedRef.current = node;
      return () => {
        if (typeof releaseSurface === "function") releaseSurface();
        if (typeof cleanup === "function") cleanup();
        else if (typeof forwardedRef === "function") forwardedRef(null);
        else if (forwardedRef) forwardedRef.current = null;
      };
    }, [ref, forwardedRef]);
    return <button ref={composed}>Ref test</button>;
  }
  const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); };
  const render = async (forwardedRef: Ref<HTMLButtonElement>, color = '#123') => {
    root.render(createElement(StrictMode, null, createElement(OynProvider, null, createElement(Probe, { forwardedRef, color }))));
    for (let i = 0; i < 300; i++) {
      await new Promise(requestAnimationFrame);
      if (container.querySelector('[data-oyn-canvas]')) break;
    }
    await settle();
  };
  try {
    await render(a);
    const firstAttach = counts.a;
    const firstCanvases = container.querySelectorAll('[data-oyn-canvas]').length;
    await render(a, '#456');
    const stableOnMaterialChange = counts.a === firstAttach;
    await render(b);
    const oldRefCleaned = counts.aCleanup === counts.a;
    await render(objectRef);
    const newRefCleaned = counts.bCleanup === counts.b;
    const objectAttached = objectRef.current === container.querySelector('button');
    root.unmount();
    await settle();
    return { firstCanvases, stableOnMaterialChange, oldRefCleaned, newRefCleaned, objectAttached, objectCleared: objectRef.current === null, noCanvases: document.querySelectorAll('[data-oyn-canvas]').length === 0 };
  } finally { container.remove(); }
}
