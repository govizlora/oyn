import { ceramicDomBinding } from '../../../packages/ceramic/src/interaction';
import { useLayoutEffect, useMemo, type CSSProperties } from 'react';
import { materialAppearance, createParameters, useSurface, type Material } from '@oyn/surface';

const font: Record<string, string[]> = {
  A: ['01110', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000'],
  G: ['01111', '10000', '10111', '10001', '01111'],
  H: ['10001', '10001', '11111', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '11111'],
  J: ['00111', '00001', '00001', '10001', '01110'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000'],
  Q: ['01110', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '11111'],
  '0': ['01110', '10011', '10101', '11001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00110', '01000', '11111'],
  '3': ['11110', '00001', '00110', '00001', '11110'],
  '4': ['10010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '11110'],
  '6': ['01111', '10000', '11110', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '00100'],
  '8': ['01110', '10001', '01110', '10001', '01110'],
  '9': ['01110', '10001', '01111', '00001', '11110'],
  '=': ['00000', '11111', '00000', '11111', '00000'],
  '(': ['00010', '00100', '00100', '00100', '00010'],
  ')': ['01000', '00100', '00100', '00100', '01000'],
  '{': ['00011', '00010', '00110', '00010', '00011'],
  '}': ['11000', '01000', '01100', '01000', '11000'],
  '.': ['00000', '00000', '00000', '00000', '00100'],
  '*': ['00000', '10101', '01110', '10101', '00000'],
  '+': ['00000', '00100', '11111', '00100', '00000'],
  '-': ['00000', '00000', '11111', '00000', '00000'],
  '>': ['10000', '01000', '00100', '01000', '10000'],
  '/': ['00001', '00010', '00100', '01000', '10000'],
  ':': ['00000', '00100', '00000', '00100', '00000'],
  ';': ['00000', '00100', '00000', '00100', '01000'],
  _: ['00000', '00000', '00000', '00000', '11111'],
};
const glyphs = Array.from({ length: 128 }, (_, code) => {
  const bits = font[String.fromCharCode(code)]?.join('') ?? '0'.repeat(25);
  return [...bits].reduce((n, bit, i) => n + Number(bit) * 2 ** i, 0);
});

// A true Surface material: the same device, frame layout, lifecycle and scheduler
// as Ceramic. No extra canvas, texture copies, or independent render loop.
const shader = /* wgsl */ `
struct Frame { viewportLight: vec4f, rect: vec4f, geometry: vec4f }
struct Parameters { controls: vec4f, phosphor: vec4f, cells: array<vec4f, 96> }
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<uniform> m: Parameters;
struct VertexOut { @builtin(position) position: vec4f, @location(0) local: vec2f }
@vertex fn vertex(@builtin(vertex_index) v: u32)->VertexOut {
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let local=corners[v]*frame.rect.zw;
  var out:VertexOut;out.local=local;
  out.position=vec4f((frame.rect.xy+local)/frame.viewportLight.xy*vec2f(2,-2)+vec2f(-1,1),0,1);return out;
}
fn textPixel(p:vec2f)->f32 {
  let grid=p*vec2f(192,96);let cell=vec2u(clamp(floor(grid/vec2f(6,8)),vec2f(0),vec2f(31,11)));
  let index=cell.y*32u+cell.x;let code=u32(m.cells[index/4u][index%4u]);
  let glyph=array<u32,128>(${glyphs.map((n) => `${n}u`).join(',')});
  let pixel=vec2u(floor(grid))%vec2u(6,8);
  if(pixel.x>4u || pixel.y>4u || code>127u){return 0;}
  return f32((glyph[code]>>(pixel.y*5u+pixel.x))&1u);
}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  let size=frame.rect.zw;let xy=in.local/size;
  let p=xy*2-1;let r=min(frame.geometry.x,min(size.x,size.y)*0.5);
  let q=abs(in.local-size*0.5)-size*0.5+r;
  let distance=length(max(q,vec2f(0)))+min(max(q.x,q.y),0)-r;
  let mask=1-smoothstep(-0.7,0.7,distance);
  let uv=xy+(xy-0.5)*dot(p,p)*0.022;
  let phase=m.controls.x;let gain=m.controls.y;let kind=m.controls.z;let power=m.controls.w;
  var light=0.0;var bloom=0.0;
  let grid=pow(max(0.0,cos(uv.x*62.83185)),100.0)+pow(max(0.0,cos(uv.y*37.69911)),100.0);
  if(kind<0.5){
    let x=(uv.x-0.5)*9;
    let wave=sin(x*(1+gain*1.6)+phase)*0.21*(0.3+gain)+sin(x*2.1-phase)*0.025;
    let d=abs(uv.y-0.5-wave);
    light=exp(-d*d*420000.0)*0.95;
    bloom=exp(-d*110.0)*0.28+exp(-d*28.0)*0.12;
    let echo=abs(uv.y-0.5-sin(x*1.2+phase+0.7)*0.19*(0.3+gain));
    bloom+=exp(-echo*100.0)*0.12;
    light+=grid*0.045;
  }else if(kind<1.5){
    let t=(uv-vec2f(0.06,0.07))/vec2f(0.9,0.92);
    if(all(t>=vec2f(0)) && all(t<vec2f(1))){
      light=textPixel(t)*0.68;
      bloom=(textPixel(t+vec2f(0.0025,0))+textPixel(t-vec2f(0.0025,0))+textPixel(t+vec2f(0,0.004))+textPixel(t-vec2f(0,0.004)))*0.08;
    }
  }else if(kind<2.5){
    let z=(uv-0.5)*vec2f(size.x/size.y,1);
    let a=atan2(z.y,z.x);let radius=length(z);
    let orbitRadius=0.27+sin(a*3+phase)*0.028*gain;
    light=exp(-abs(radius-orbitRadius)*550.0)*0.8;
    bloom=exp(-abs(radius-orbitRadius)*70.0)*0.22;
    light+=exp(-abs(z.x)*700.0)*0.1+exp(-abs(z.y)*700.0)*0.1+grid*0.03;
    let dot=length(z-vec2f(cos(phase),sin(phase))*orbitRadius);
    light+=exp(-dot*180.0);bloom+=exp(-dot*45.0)*0.4;
  }else if(kind<3.5){
    let bar=floor(uv.x*32.0);let bx=fract(uv.x*32.0);
    let height=0.15+abs(sin(bar*0.27+phase)*cos(bar*0.13-phase*0.4))*(0.2+gain*0.5);
    let rows=fract(uv.y*26.0);
    light=select(0.0,0.6,bx>0.25 && bx<0.75 && uv.y>0.88-height && uv.y<0.88 && rows>0.3);
    bloom=select(0.0,0.08,bx>0.1 && bx<0.9 && uv.y>0.88-height && uv.y<0.88);
    light+=grid*0.035;
  }else{
    let field=uv*vec2f(38,16);let cell=floor(field);let center=fract(field)-0.5;
    let wave=sin(cell.x*0.22+phase)+cos(cell.y*0.42-phase*0.7);
    let radius=0.10+(wave+2.0)*0.045*(0.4+gain);
    let dist=length(center);
    light=(1-smoothstep(radius-0.06,radius+0.04,dist))*(0.16+(wave+2.0)*0.16);
    bloom=exp(-dist*7.0)*0.07;
  }
  let scan=0.87+0.13*sin(in.local.y*3.1415926);
  let vignette=1-dot(p*0.45,p*0.45);
  let glass=vec3f(0.025,0.034,0.03)+vec3f(0.035)*pow(max(0.0,1-uv.y),4.0);
  let ink=m.phosphor.xyz*((light*scan+bloom)*vignette*power);
  let result=glass+ink;
  return vec4f(result*mask,mask);
}`;

export const program = `SURFACE.BIND(INPUT)
LAYOUT.GRID(12)

SELECT.MULTIPLE()
LIGHT.FOLLOW(POINTER)

> READY
> _`;
function makePhosphor(kind: number, amber: boolean): Material {
  return {
    bind: ceramicDomBinding,
    shader,
    passes: ['surface'],
    parameters: createParameters([
      0.8,
      0.6,
      kind,
      1,
      ...(amber ? [0.92, 0.65, 0.32] : [0.58, 0.88, 0.73]),
      0,
      ...Array(384).fill(0),
    ]),
    bounds: { initial: 0, measure: () => ({ x: 0, y: 0 }) },
  };
}
export function Phosphor({
  kind = 'wave',
  code = program,
  value = 60,
  phase = 0.8,
  powered = true,
  amber = false,
  className = '',
  style,
}: {
  kind?: 'wave' | 'code' | 'orbit' | 'spectrum' | 'field';
  code?: string;
  value?: number;
  phase?: number;
  powered?: boolean;
  amber?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const material = useMemo(
    () =>
      makePhosphor(
        { wave: 0, code: 1, orbit: 2, spectrum: 3, field: 4 }[kind],
        amber,
      ),
    [kind, amber],
  );
  useLayoutEffect(() => {
    material.parameters.set(0, phase);
    material.parameters.set(1, value / 100);
    material.parameters.set(3, Number(powered));
  }, [material, phase, value, powered]);
  const screenText = code
    .toUpperCase()
    .split('\n')
    .slice(0, 12)
    .map((line) =>
      [...line.slice(0, 32)]
        .map((letter) => (font[letter] ? letter : ' '))
        .join(''),
    )
    .join('\n');
  useLayoutEffect(() => {
    const cells = Array(384).fill(0);
    screenText.split('\n').forEach((line, y) =>
      [...line].forEach((letter, x) => {
        cells[y * 32 + x] = letter.charCodeAt(0);
      }),
    );
    cells.forEach((cell, i) => material.parameters.set(i + 8, cell));
  }, [material, screenText]);
  const ref = useSurface({ appearance: materialAppearance, props: { material: material } });
  return (
    <div
      ref={ref}
      className={`phosphor ${className}`}
      style={style}
      role={kind === 'code' ? undefined : 'img'}
      aria-label={
        kind === 'code'
          ? undefined
          : `Phosphor ${kind} responding to the controls`
      }
    >
      {kind === 'code' && <pre className="sr-only">{screenText}</pre>}
    </div>
  );
}
