import { decodeGeometry, type BakedGeometry } from '@oyn/ceramic/baked';
/** App-owned, finite preset catalogue. GPU ownership stays in Surface. */
const assets = new Map<string, Promise<BakedGeometry>>();
export function loadGeometry(key: string) {
  let result = assets.get(key);
  if (!result) {
    const base = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;
    result = fetch(`${base}geometries/${key}.bin`).then(response => {
      if (!response.ok) throw Error(`Unable to load geometry: ${key}`);
      return response.arrayBuffer();
    }).then(decodeGeometry);
    assets.set(key, result);
    result.catch(() => assets.delete(key));
  }
  return result;
}
