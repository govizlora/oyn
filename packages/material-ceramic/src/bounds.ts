import { SHADOW } from './optics.js';
import defaults from './defaults.json' with { type: 'json' };
export function validateElevation(value: number, lightHeight = defaults.shadowLightHeight) {
  if (!Number.isFinite(value) || value < 0 || Math.fround(value) >= lightHeight) throw Error(`Ceramic elevation must be finite and in [0, ${lightHeight}).`);
}
/** Bound each shadow contribution to 0.0005 alpha, plus two CSS px for AA. */
export function shadowBounds(width: number, height: number, elevation: number,
  shadow: ArrayLike<number> = [defaults.shadowLightHeight, defaults.shadowLightSize, defaults.shadowStrength, defaults.contactShadowStrength]) {
  const [lightHeight, lightSize, strength, contact] = Array.from(shadow);
  validateElevation(elevation, lightHeight);
  if (!elevation) return { x: 2, y: 2 };
  const ratio = elevation / (lightHeight - elevation);
  const epsilon = 0.0005;
  const tail = Math.max(lightSize * ratio * 0.5, SHADOW.minSigma) * Math.sqrt(2 * Math.max(0, Math.log(Math.max(1, strength / epsilon))));
  const aoStrength = contact * Math.min(elevation, 1) * (1 - strength);
  const ao = Math.max(SHADOW.minAoFalloff, elevation * SHADOW.aoFalloff) * Math.max(0, Math.log(Math.max(1, aoStrength / epsilon)));
  const extent = (size: number) => Math.ceil(Math.max(strength > epsilon ? (lightHeight + size / 2) * ratio + tail : 0, ao) + 2);
  return { x: extent(width), y: extent(height) };
}
