import { ceramicBinding } from "../../../packages/oyn/src/materials/ceramic/interaction";
import { useLayoutEffect, useMemo, type HTMLAttributes } from "react";
import { materialAppearance, createParameters, type Material } from "oyn";
import { useMaterial } from "oyn/react";

const shader = /* wgsl */ `
struct Frame { viewportLight: vec4f, rect: vec4f, geometry: vec4f }
struct Parameters { light: vec4f }
@group(0) @binding(0) var<uniform> f: Frame;
@group(0) @binding(1) var<uniform> m: Parameters;
struct V { @builtin(position) position: vec4f, @location(0) p: vec2f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->V {
  let c=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let p=c[i]*(f.rect.zw+28.0)-14.0;
  var v:V;v.p=p;v.position=vec4f((f.rect.xy+p)/f.viewportLight.xy*vec2f(2,-2)+vec2f(-1,1),0,1);return v;
}
@fragment fn surface(v:V)->@location(0) vec4f {
  let size=f.rect.zw;
  let radius=min(f.geometry.x,min(size.x,size.y)*0.5);
  let q=abs(v.p-size*0.5)-size*0.5+radius;
  let sd=length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0)-radius;
  let body=1.0-smoothstep(-0.6,0.6,sd);
  let level=m.light.w;
  let glow=exp(-max(sd,0.0)*0.25)*0.22*level*(1.0-body);
  let lens=mix(vec3f(0.66,0.69,0.62),m.light.rgb,level);
  let y=clamp(v.p.y/max(size.y,1.0),0.0,1.0);
  let shine=pow(1.0-y,5.0)*0.25+exp(-abs(sd+1.0)*1.4)*0.10;
  let ink=lens*(0.79+0.22*(1.0-y))+vec3f(shine)+m.light.rgb*level*0.25;
  return vec4f(ink*body+m.light.rgb*glow,body+glow);
}`;
const lampColors = {
  orange: [1, 0.37, 0.12],
  sage: [0.57, 0.8, 0.35],
  ice: [0.45, 0.77, 0.9],
  lilac: [0.72, 0.6, 0.91],
} as const;
export type LampColor = keyof typeof lampColors;
function glowMaterial(): Material {
  return {
    bind: ceramicBinding(),
    shader,
    passes: ["surface"],
    parameters: createParameters([...lampColors.orange, 0]),
    measurePadding: () => ({ x: 14, y: 14 }),
  };
}
export function Glow({
  level = 1,
  color = "orange",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { level?: number; color?: LampColor }) {
  const material = useMemo(glowMaterial, []);
  useLayoutEffect(() => {
    material.parameters.set(3, level);
    lampColors[color].forEach((v, i) => material.parameters.set(i, v));
  }, [material, level, color]);
  const ref = useMaterial({
    appearance: materialAppearance,
    props: { material },
  });
  return <span ref={ref} className={`glow-lens ${className}`} {...props} />;
}
