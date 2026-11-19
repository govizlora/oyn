import { ceramicBinding } from '../../../packages/ceramic/src/interaction';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type HTMLAttributes,
} from 'react';
import { materialAppearance, createParameters, useSurface, type Material } from '@oyn/surface';
import { followMotion } from './motion-clock';

// Two optical objects, one shader/pipeline: a swept rotor and a luminous lens.
// Housing, hub and controls are still the shared Ceramic material.
const shader = /* wgsl */ `
struct Frame { viewportLight: vec4f, rect: vec4f, geometry: vec4f }
struct Parameters { control: vec4f, color: vec4f, shape: vec4f }
@group(0) @binding(0) var<uniform> f: Frame;
@group(0) @binding(1) var<uniform> m: Parameters;
struct V { @builtin(position) position: vec4f, @location(0) p: vec2f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->V {
  let c=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let p=c[i]*(f.rect.zw+28.0)-14.0;
  var v:V;v.p=p;v.position=vec4f((f.rect.xy+p)/f.viewportLight.xy*vec2f(2,-2)+vec2f(-1,1),0,1);return v;
}
fn bladeDistance(p:vec2f)->f32 {
  var d=10.0;
  for(var i=0u;i<7u;i++) {
    if(f32(i)>=m.shape.x){break;}
    let a=m.control.x+f32(i)*6.2831853/m.shape.x;
    var q=vec2f(cos(a)*p.x+sin(a)*p.y,-sin(a)*p.x+cos(a)*p.y);
    q.y-=0.36*q.x*q.x;
    let e=(q-vec2f(0.43,0.015))/vec2f(0.43,0.155);
    d=min(d,(length(e)-1.0)*0.155);
  }
  return d;
}
@fragment fn surface(v:V)->@location(0) vec4f {
  let size=f.rect.zw;
  if(m.control.y>0.5) {
    let radius=min(f.geometry.x,min(size.x,size.y)*0.5);
    let q=abs(v.p-size*0.5)-size*0.5+radius;
    let sd=length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0)-radius;
    let body=1.0-smoothstep(-0.6,0.6,sd);
    let level=m.control.w;
    let glow=exp(-max(sd,0.0)*0.25)*0.22*level*(1.0-body);
    let lens=mix(vec3f(0.66,0.69,0.62),m.color.rgb,level);
    let y=clamp(v.p.y/max(size.y,1.0),0.0,1.0);
    let shine=pow(1.0-y,5.0)*0.25+exp(-abs(sd+1.0)*1.4)*0.10;
    let ink=lens*(0.79+0.22*(1.0-y))+vec3f(shine)+m.color.rgb*level*0.25;
    return vec4f(ink*body+m.color.rgb*glow,body+glow);
  }
  let p=(v.p-size*0.5)/(min(size.x,size.y)*0.5);
  let r=length(p);
  let mask=1.0-smoothstep(0.984,0.996,r);
  if(mask<0.001){return vec4f(0);}
  let d=bladeDistance(p);
  let eps=0.003;
  let normal=normalize(vec3f((bladeDistance(p+vec2f(eps,0))-bladeDistance(p-vec2f(eps,0)))*18.0,(bladeDistance(p+vec2f(0,eps))-bladeDistance(p-vec2f(0,eps)))*18.0,0.32));
  let lighting=dot(normal,normalize(vec3f(-0.5f,-0.7f,1.5f)));
  let shadow=exp(-max(bladeDistance(p-vec2f(0.018,0.042)),0.0)*38.0)*0.20;
  let recess=0.88-0.09*pow(r,6.0)-shadow;
  var color=vec3f(recess*0.986,recess,recess*0.961);
  let blade=1.0-smoothstep(-0.003,0.004,d);
  let bevel=exp(-abs(d+0.012)*55.0)*0.045;
  let ceramic=mix(vec3f(0.86,0.885,0.83),vec3f(0.97,0.975,0.95),lighting)+bevel;
  color=mix(color,ceramic,blade);
  if(m.color.w>0.5) {
    let rings=abs(fract(r*7.0+0.1)-0.5)/7.0;
    let ring=1.0-smoothstep(0.004,0.010,rings);
    let a=atan2(p.y,p.x);
    let spokes=abs(sin(a*3.0))*r;
    let spoke=1.0-smoothstep(0.006,0.016,spokes);
    let grille=max(ring,spoke)*smoothstep(0.18,0.22,r);
    color=mix(color,vec3f(0.92,0.935,0.90),grille*0.92);
  }
  let grain=(fract(sin(dot(v.p,vec2f(12.9898,78.233)))*43758.5453)-0.5)*0.004;
  return vec4f((color+grain)*mask,mask);
}`;
const lampColors = {
  orange: [1, 0.37, 0.12],
  sage: [0.57, 0.8, 0.35],
  ice: [0.45, 0.77, 0.9],
  lilac: [0.72, 0.6, 0.91],
} as const;
export type LampColor = keyof typeof lampColors;
function instrumentMaterial(kind: number): Material {
  return {
    bind: ceramicBinding(),
    shader,
    passes: ['surface'],
    parameters: createParameters([
      0.35,
      kind,
      0,
      0,
      ...lampColors.orange,
      0,
      5,
      0,
      0,
      0,
    ]),
    measurePadding: () => ({ x: 14, y: 14 }),
  };
}
export function Glow({
  level = 1,
  color = 'orange',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { level?: number; color?: LampColor }) {
  const material = useMemo(() => instrumentMaterial(1), []);
  useLayoutEffect(() => {
    material.parameters.set(3, level);
    lampColors[color].forEach((v, i) => material.parameters.set(4 + i, v));
  }, [material, level, color]);
  const ref = useSurface({ appearance: materialAppearance, props: { material: material } });
  return <span ref={ref} className={`glow-lens ${className}`} {...props} />;
}
// The dial/readout and shader share this single speed calibration.
const rotorRadiansPerSecond = (speed: number) =>
  speed > 0 ? 0.5 + speed / 17 : 0;

export function RotorPaint({
  speed,
  powered,
  reverse = false,
  covered = false,
  blades = 5,
}: {
  speed: number;
  powered: boolean;
  reverse?: boolean;
  covered?: boolean;
  blades?: number;
}) {
  const material = useMemo(() => instrumentMaterial(0), []),
    phase = useRef(0.35);
  useLayoutEffect(() => {
    material.parameters.set(7, Number(covered));
    material.parameters.set(8, blades);
  }, [material, covered, blades]);
  useEffect(() => {
    if (!powered || speed === 0) return;
    return followMotion((dt) => {
      phase.current =
        (phase.current +
          dt * rotorRadiansPerSecond(speed) * (reverse ? -1 : 1)) %
        (Math.PI * 2);
      material.parameters.set(0, phase.current);
    });
  }, [material, powered, speed, reverse]);
  const ref = useSurface({ appearance: materialAppearance, props: { material: material } });
  return (
    <div
      ref={ref}
      className="rotor-paint"
      role="img"
      aria-label={`Rotor, ${powered && speed > 0 ? 'running' : 'stopped'}, ${blades} blades${reverse ? ', reverse' : ''}`}
    />
  );
}
