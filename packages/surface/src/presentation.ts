import type { Mesh } from './types/scene.js';
import type { Insets, SurfaceBinding } from './types/material.js';

/** A canvas belongs only to its own element. Native DOM owns clipping and stacking. */
export function createPresentation(mesh: Mesh) {
  const host = mesh.element;
  const position = host.style.position,
    isolation = host.style.isolation;
  const positioned = getComputedStyle(host).position === 'static';
  if (positioned) host.style.position = 'relative';
  host.style.isolation = 'isolate';
  // Keep the padded bitmap out of scrollable overflow. The host-sized layer
  // owns layout bounds; layout containment keeps exterior ink from enlarging
  // ancestor scroll areas without clipping that ink.
  const layer = document.createElement('span');
  layer.dataset.oynLayer = '';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:absolute;inset:0;display:block;pointer-events:none;z-index:-1;contain:layout;';
  const canvas = document.createElement('canvas');
  canvas.dataset.oynCanvas = '';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;pointer-events:none;display:block;';
  layer.append(canvas);
  host.append(layer);
  host.setAttribute('data-oyn-active', '');
  let cachedBounds: DOMRect | undefined;
  let width = 0,
    height = 0,
    pad: Insets = { x: 0, y: 0 };
  function measure(limit: number) {
    width = host.offsetWidth;
    height = host.offsetHeight;
    cachedBounds = undefined;
    pad = mesh.material.measurePadding(width, height);
    if (![pad.x, pad.y].every((v) => Number.isFinite(v) && v >= 0))
      throw Error('Invalid material padding.');
    const cssW = width + 2 * pad.x,
      cssH = height + 2 * pad.y;
    const w = Math.max(1, Math.ceil(cssW * devicePixelRatio)),
      h = Math.max(1, Math.ceil(cssH * devicePixelRatio));
    if (Math.max(w, h) > limit)
      throw Error(`Surface canvas ${w} × ${h} exceeds GPU limit ${limit}.`);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${-pad.x - host.clientLeft}px`;
    canvas.style.top = `${-pad.y - host.clientTop}px`;
  }
  function frame(binding: SurfaceBinding | undefined, positionDirty: boolean) {
    if (!cachedBounds || positionDirty)
      cachedBounds = canvas.getBoundingClientRect();
    const bounds = cachedBounds;
    if (
      !host.isConnected ||
      !width ||
      !height ||
      !bounds.width ||
      !bounds.height
    )
      return null;
    const cssW = width + 2 * pad.x,
      cssH = height + 2 * pad.y;
    const extras = binding?.frame?.({
      element: host,
      width,
      height,
      toLocal: (point) => ({
        x: ((point.x - bounds.left) * cssW) / bounds.width,
        y: ((point.y - bounds.top) * cssH) / bounds.height,
      }),
    }) ?? [0, 0, 0];
    if (
      extras.length !== 3 ||
      !extras.every(
        (v) => Number.isFinite(v) && Number.isFinite(Math.fround(v)),
      )
    )
      throw Error('Invalid appearance frame inputs.');
    return new Float32Array([
      cssW,
      cssH,
      extras[0],
      extras[1],
      pad.x,
      pad.y,
      width,
      height,
      extras[2],
      canvas.width / cssW,
      canvas.height / cssH,
      0,
    ]);
  }
  function dispose() {
    host.removeAttribute('data-oyn-active');
    layer.remove();
    canvas.width = canvas.height = 0;
    if (positioned && host.style.position === 'relative')
      host.style.position = position;
    if (host.style.isolation === 'isolate') host.style.isolation = isolation;
  }
  return { canvas, measure, frame, dispose };
}
