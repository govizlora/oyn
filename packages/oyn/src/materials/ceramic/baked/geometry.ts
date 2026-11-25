import type { StaticData } from "../../../core/index.js";

/** Versioned, immutable orthographic geometry. Creation only decodes baked data. */
export type BakedGeometry = Readonly<{
  data: StaticData;
  resolution: number;
  extent: number;
  height: number;
  shadowResolution: number;
  shadowExtent: number;
  width: number;
  depth: number;
  radius: number;
  analyticOutline: boolean;
}>;
export function decodeGeometry(buffer: ArrayBuffer): BakedGeometry {
  if (buffer.byteLength < 32 || buffer.byteLength % 4)
    throw Error("Invalid baked geometry.");
  const header = new Float32Array(buffer, 0, 8);
  const [version, n, a, b, c, d, levels] = header;
  if (!Number.isInteger(n) || n < 2 || n > 1024)
    throw Error("Invalid baked resolution.");
  let description: Omit<BakedGeometry, "data">;
  if (version === 3) {
    if (
      ![a, b, c].every(Number.isFinite) ||
      a <= 0 ||
      b <= 0 ||
      c < 0 ||
      c > Math.min(a, b) / 2 ||
      buffer.byteLength !== 32 + n * n * 8
    )
      throw Error("Invalid baked control.");
    description = {
      resolution: n,
      extent: a,
      height: 0,
      shadowResolution: 0,
      shadowExtent: 0,
      width: a,
      depth: b,
      radius: c,
      analyticOutline: true,
    };
  } else {
    if (
      version !== 2 ||
      levels !== 7 ||
      !Number.isInteger(c) ||
      c < 2 ||
      c > 1024 ||
      ![a, b, d].every((v) => Number.isFinite(v) && v > 0) ||
      buffer.byteLength !== 32 + n * n * 8 + c * c * 6 * 7 ||
      (c * c * 6 * 7) % 4
    )
      throw Error("Unsupported baked geometry.");
    description = {
      resolution: n,
      extent: a,
      height: b,
      shadowResolution: c,
      shadowExtent: d,
      width: a,
      depth: a,
      radius: 0,
      analyticOutline: false,
    };
  }
  // Own a copy: caller mutations cannot alter the immutable resource.
  return Object.freeze({
    ...description,
    data: Object.freeze({ bytes: new Uint8Array(buffer.slice(32)) }),
  });
}
