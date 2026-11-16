import { createParameters, type Material, type SurfaceMode } from '@oyn/surface';
import { frameWGSL } from './effects/frame.js';
import { geometryWGSL } from './effects/geometry.js';

// Port of Still Creek's concave floor + wall optics. Focus/glass are not part of this material.
export const insetDefaults = Object.freeze({
  depth: 2.3, wallAngle: 50, curve: 2, highlightStrength: 1.2,
  highlightSharpness: 80.8, diffuseStrength: 0.15, diffuseFalloff: 2.14,
  ambientShade: 0.05, directionalShade: 0.2, shadeFalloff: 0.8,
  lightFloor: 226.56, darkFloor: 0,
});
export type InsetOptions = { [K in keyof typeof insetDefaults]?: number } & { mode?: SurfaceMode };
const shader = /* wgsl */ `
${frameWGSL}
struct Parameters { floor: vec4f, wall: vec4f, highlight: vec4f, shade: vec4f }
@group(0) @binding(1) var<uniform> material: Parameters;
${geometryWGSL}
@fragment fn surface(in: VertexOut) -> @location(0) vec4f {
  let halfSize = in.card.zw * 0.5;
  let p = in.local - halfSize;
  let radius = min(frame.geometry.x, min(halfSize.x, halfSize.y));
  let d = roundedRect(p, halfSize, radius);
  let mask = surfaceMask(d);
  let rim = max(material.wall.x, 0.0001);
  let rimMask = mask * (1 - surfaceMask(d + rim));
  let edge = 1 - clamp(-d, 0, rim) / rim;
  let angle = material.wall.y * pow(edge, material.wall.z);
  let facing = -gradient(p, halfSize, radius);
  let light = normalize(vec3f(frame.viewportLight.zw - (in.card.xy + in.local), 24));
  let halfVec = normalize(light + vec3f(0, 0, 1));
  let normal = vec3f(facing * sin(angle), cos(angle));
  let direction = dot(facing, light.xy);
  let band = rimMask * sin(angle);
  let diffuse = pow(max(direction, 0), material.highlight.w);
  let specular = pow(max(dot(normal, halfVec), 0), material.highlight.y);
  let highlight = clamp((material.highlight.z * diffuse + specular) * band * material.highlight.x, 0, 1);
  let backlit = smoothstep(0, material.shade.z, -direction);
  let shade = band * clamp(material.shade.x + material.shade.y * backlit, 0, 1);
  let coverage = mask * (1 - exp(-material.wall.w));
  return over(vec4f(vec3f(highlight), highlight + shade * (1-highlight)), vec4f(material.floor.xyz * coverage, coverage));
}
`;
export function inset(options: InsetOptions = {}): Material {
  const s = { ...insetDefaults, ...options };
  for (const key of Object.keys(insetDefaults) as (keyof typeof insetDefaults)[]) {
    if (!Number.isFinite(s[key]) || !Number.isFinite(Math.fround(s[key])) || s[key] < 0) throw Error(`Invalid inset ${key}.`);
  }
  if (s.wallAngle <= 0 || s.wallAngle >= 90 || s.shadeFalloff <= 0 || s.lightFloor > 255 || s.darkFloor > 255) throw Error('Invalid inset wall or floor.');
  const angle = s.wallAngle * Math.PI / 180;
  let slope = 0;
  for (let i = 0; i < 256; i++) slope += Math.tan(angle * ((i + 0.5) / 256) ** s.curve) / 256;
  const floor = (s.mode === 'dark' ? s.darkFloor : s.lightFloor) / 255;
  const variants = new Map<SurfaceMode, Material>();
  return {
    resolveMode: options.mode === undefined ? mode => {
      if (!variants.has(mode)) variants.set(mode, inset({ ...options, mode }));
      return variants.get(mode)!;
    } : undefined,
    shader, passes: ['surface'],
    parameters: createParameters([floor, floor, floor, 0, s.depth / slope, angle, s.curve, s.depth,
      s.highlightStrength, s.highlightSharpness, s.diffuseStrength, s.diffuseFalloff,
      s.ambientShade, s.directionalShade, s.shadeFalloff, 0]),
    bounds: { initial: 0, measure: () => ({ x: 1, y: 1 }) },
  };
}
