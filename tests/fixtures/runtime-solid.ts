import { ceramicBinding } from '../../packages/ceramic/src/interaction';
// Historical runtime-CSG baseline, test-only. Never import from application code.
import { createParameters, type Material } from '@oyn/surface';
import { frameWGSL } from '../../packages/ceramic/src/effects/frame.js';
import { createCeramicMaterial, type CeramicOptions } from '../../packages/ceramic/src/index.js';
import { shadowBounds } from '../../packages/ceramic/src/bounds.js';
import { geometryWGSL } from '../../packages/ceramic/src/effects/geometry.js';
import { ceramicLightingWGSL } from '../../packages/ceramic/src/effects/ceramic-lighting.js';
import { ceramicGeometryWGSL } from '../../packages/ceramic/src/effects/ceramic-geometry.js';
import { gaussianCoverageWGSL, ceramicShadowWGSL } from '../../packages/ceramic/src/effects/shadow.js';

export type Vec3 = readonly [number, number, number];
export type Solid =
  | { kind: 'sphere'; center: Vec3; radius: number }
  | {
      kind: 'card';
      center: Vec3;
      halfSize: Vec3;
      radius: number;
      bevel?: number;
    }
  | { kind: 'box'; center: Vec3; halfSize: Vec3; bevel?: number }
  | {
      kind: 'cylinder';
      center: Vec3;
      radius: number;
      halfHeight: number;
      bevel?: number;
    }
  | { kind: 'union' | 'subtract' | 'intersect'; a: Solid; b: Solid };
const MAX_NODES = 24;
type Bounds = { min: number[]; max: number[] };
/** Postfix CSG program. One evaluator/pipeline handles every primitive tree. */
export function compileSolid(solid: Solid) {
  const nodes: number[] = [];
  const positive = (v: number) => {
    if (!Number.isFinite(v) || v <= 0)
      throw Error('Solid dimensions must be positive and finite.');
    return v;
  };
  function visit(node: Solid, depth = 0): Bounds {
    if (depth > MAX_NODES || nodes.length / 12 >= MAX_NODES)
      throw Error('Solid exceeds 24 nodes.');
    if ('a' in node) {
      const a = visit(node.a, depth + 1),
        b = visit(node.b, depth + 1);
      nodes.push(
        node.kind === 'union' ? 3 : node.kind === 'subtract' ? 4 : 5,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      );
      if (node.kind === 'subtract') return a;
      return {
        min: a.min.map((v, i) =>
          node.kind === 'union' ? Math.min(v, b.min[i]) : Math.max(v, b.min[i]),
        ),
        max: a.max.map((v, i) =>
          node.kind === 'union' ? Math.max(v, b.max[i]) : Math.min(v, b.max[i]),
        ),
      };
    }
    if (node.center.length !== 3 || !node.center.every(Number.isFinite))
      throw Error('Invalid solid center.');
    let extent: number[], args: number[], kind: number;
    if (node.kind === 'sphere') {
      const r = positive(node.radius);
      extent = [r, r, r];
      args = [r, 0, 0, 0];
      kind = 0;
    } else if (node.kind === 'cylinder') {
      const r = positive(node.radius),
        h = positive(node.halfHeight);
      extent = [r, r, h];
      const bevel = node.bevel ?? 0.7;
      if (!Number.isFinite(bevel) || bevel < 0 || bevel > Math.min(r, h))
        throw Error('Invalid cylinder bevel.');
      args = [r, h, bevel, 0];
      kind = 2;
    } else {
      if (node.halfSize.length !== 3) throw Error('Invalid box dimensions.');
      extent = node.halfSize.map(positive);
      const bevel = node.bevel ?? 0;
      if (!Number.isFinite(bevel) || bevel < 0 || bevel > Math.min(...extent))
        throw Error('Invalid solid bevel.');
      args = [...extent, bevel];
      kind = 1;
    }
    let radius = 0;
    if (node.kind === 'card') {
      radius = node.radius;
      if (
        !Number.isFinite(radius) ||
        radius < 0 ||
        radius > Math.min(extent[0], extent[1])
      )
        throw Error('Invalid card corner radius.');
      kind = 6;
    }
    nodes.push(kind, ...node.center, ...args, radius, 0, 0, 0);
    return {
      min: node.center.map((v, i) => v - extent[i]),
      max: node.center.map((v, i) => v + extent[i]),
    };
  }
  const bounds = visit(solid);
  if (nodes.length / 12 > MAX_NODES) throw Error('Solid exceeds 24 nodes.');
  if (bounds.min.some((v, i) => v >= bounds.max[i]) || bounds.min[2] < 0)
    throw Error('Solid bounds must be nonempty and above the receiving plane.');
  if (!nodes.every((v) => Number.isFinite(Math.fround(v))))
    throw Error('Solid exceeds numeric range.');
  return { nodes, bounds };
}
const shader = /* wgsl */ `
${frameWGSL}
${geometryWGSL}
${ceramicLightingWGSL}
${ceramicGeometryWGSL}
${gaussianCoverageWGSL}
struct Node { center:vec4f, shape:vec4f, reserved:vec4f }
struct Parameters { bounds:vec4f, scene:vec4f, nodes:array<Node,24>, ceramic:CeramicOptics }
@group(0) @binding(1) var<uniform> m: Parameters;
fn geometry(p:vec3f)->f32 {
 var stack:array<f32,24>;var count=0u;
 for(var i=0u;i<24u;i++) {
  if(f32(i)>=m.scene.x){break;}
  let node=m.nodes[i];let op=u32(node.center.x);
  if(op>=3u && op<=5u) {
   let b=stack[count-1u];let a=stack[count-2u];count-=1u;
   var d=min(a,b);if(op==4u){d=max(a,-b);}if(op==5u){d=max(a,b);}stack[count-1u]=d;
  } else {
   let q=p-node.center.yzw;var d=0.0;
   if(op==0u){d=length(q)-node.shape.x;}
   if(op==1u){let v=abs(q)-node.shape.xyz+node.shape.w;d=length(max(v,vec3f(0)))+min(max(v.x,max(v.y,v.z)),0.0)-node.shape.w;}
   if(op==2u){let v=vec2f(length(q.xy)-node.shape.x+node.shape.z,abs(q.z)-node.shape.y+node.shape.z);d=min(max(v.x,v.y),0.0)+length(max(v,vec2f(0)))-node.shape.z;}
   if(op==6u){
    let bevel=node.shape.w;let radius=max(node.reserved.x-bevel,0.0);
    let q2=abs(q.xy)-(node.shape.xy-vec2f(bevel))+radius;
    let planar=length(max(q2,vec2f(0)))+min(max(q2.x,q2.y),0.0)-radius;
    let v=vec2f(planar,abs(q.z)-node.shape.z+bevel);
    d=length(max(v,vec2f(0)))+min(max(v.x,v.y),0.0)-bevel;
   }
   stack[count]=d;count+=1u;
  }
 }
 return stack[0];
}
fn normal(p:vec3f)->vec3f {
 let e=0.08;
 return normalize(vec3f(geometry(p+vec3f(e,0,0))-geometry(p-vec3f(e,0,0)),geometry(p+vec3f(0,e,0))-geometry(p-vec3f(0,e,0)),geometry(p+vec3f(0,0,e))-geometry(p-vec3f(0,0,e))));
}
fn visibility(p:vec3f,l:vec3f)->f32 {
 var t=0.2;var result=1.0;
 for(var i=0;i<40;i++) {
  let d=geometry(p+l*t);
  if(d<0.015){return 0.0;}
  result=min(result,(m.ceramic.shadow.x/max(m.ceramic.shadow.y,1.0))*d/t);t+=clamp(d,0.2,12.0);
  if(t>m.scene.z*3.0+60.0){break;}
 }
 return clamp(result,0.0,1.0);
}
fn sceneScale()->f32 {return min(frame.rect.z/m.scene.w,frame.rect.w/m.scene.y);}
fn analyticCard()->bool {return m.scene.x==1.0 && m.nodes[0].center.x==6.0;}
fn geometryShadowCoverage(p:vec2f,projection:f32,blur:f32,height:f32)->f32 {
 let scale=sceneScale();let node=m.nodes[0];
 if(analyticCard()) {
  if(height < (node.center.w-node.shape.z)*scale){return 0.0;}
  return roundedCoverage(p-node.center.yz*scale*projection,node.shape.xy*scale*projection,node.reserved.x*scale*projection,blur);
 }
 // Gaussian quadrature over the actual CSG slice. Same light integration as
 // legacy Ceramic; only silhouette coverage is approximate for complex solids.
 let offsets=array<f32,3>(-1.7320508f,0.0f,1.7320508f);
 let weights=array<f32,3>(0.16666667f,0.66666667f,0.16666667f);
 var coverage=0.0;let sigma=max(blur,0.35);
 for(var y=0u;y<3u;y++){for(var x=0u;x<3u;x++){
  let xy=(p+vec2f(offsets[x],offsets[y])*sigma)/(projection*scale);
  let z=max(height/scale-0.04,0.02);
  let d=geometry(vec3f(xy,z))*scale*projection;
  coverage+=weights[x]*weights[y]*(1.0-smoothstep(-0.4,0.4,d));
 }}
 return coverage;
}
fn geometryShadowDistance(p:vec2f)->f32 {
 let scale=sceneScale();let node=m.nodes[0];
 if(analyticCard()){return roundedRect(p-node.center.yz*scale,node.shape.xy*scale,node.reserved.x*scale);}
 var d=10000.0;
 for(var i=0;i<8;i++){
  let z=mix(m.bounds.y,m.bounds.x,(f32(i)+0.5)/8.0);
  d=min(d,geometry(vec3f(p/scale,z))*scale);
 }
 return d;
}
${ceramicShadowWGSL}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f {
 let b=in.card.zw*0.5;
 return ceramicShadow(in.local-b,in.card.xy+b-frame.viewportLight.zw,m.bounds.x*sceneScale(),m.ceramic.shadow);
}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
 let scale=sceneScale();let center=in.card.xy+in.card.zw*0.5;
 let xy=(in.local-in.card.zw*0.5)/scale;
 if(analyticCard()) {
  let node=m.nodes[0];
  let g=roundedCeramicGeometry((xy-node.center.yz)*scale,node.shape.xy*scale,node.reserved.x*scale,max(1,m.ceramic.shape.z),1.0f,center+node.center.yz*scale);
  return lightCeramic(m.ceramic,g,frame.viewportLight.zw);
 }
 let ro=vec3f(xy,m.scene.z+1.0);var t=0.0;var hit=false;
 for(var i=0;i<100;i++) {
  let d=geometry(ro-vec3f(0,0,t));
  if(d<0.035){hit=true;break;}
  t+=max(d*0.85,0.025);if(t>ro.z){break;}
 }
 if(!hit){return vec4f(0);}
 let p=ro-vec3f(0,0,t);let n=normal(p);
 var grad=vec2f(0,-1);if(length(n.xy)>0.0001){grad=normalize(n.xy);}
 let angle=acos(clamp(n.z,0.0,1.0));let band=clamp(angle/1.48,0.0,1.0);
 let light=normalize(vec3f(frame.viewportLight.zw-(in.card.xy+in.local),m.ceramic.reflection.x));
 let v=visibility(p+n*0.15,light);
 let g=CeramicGeometry(n,grad,band,1.0,select(0.0,1.0,band>0.0001),band,xy*scale,m.bounds.zw*scale*0.5,center,in.card.xy+in.local,v,n,n);
 return lightCeramic(m.ceramic,g,frame.viewportLight.zw);
}

`;
/** Opt-in orthographic solid renderer: same geometry owns face, normal and shadow.
 * Light-mode only. Fixed framing keeps interactive cutters from resizing objects.
 */
export function solidCeramic(
  solid: Solid,
  options: {
    color?: Vec3;
    extent?: number | readonly [number, number];
    ceiling?: number;
    /** The same optical options as legacy Ceramic; geometry owns elevation. */
    finish?: Omit<CeramicOptions, 'elevation' | 'maxElevation'>;
  } = {},
) {
  const framing = options.extent ?? 130;
  const [extentX, extentY] =
    typeof framing === 'number' ? [framing, framing] : framing;
  const ceiling = options.ceiling ?? 100;
  if (![extentX, extentY, ceiling].every((v) => Number.isFinite(v) && v > 0))
    throw Error('Invalid solid framing.');
  const color = options.color;
  if (
    color &&
    (color.length !== 3 ||
      !color.every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
  )
    throw Error('Invalid solid color.');
  const finish = createCeramicMaterial({
    ...options.finish,
    colorScheme: options.finish?.colorScheme ?? 'light',
    ...(color ? { color: `rgb(${color.map((v) => v * 255).join(' ')})` } : {}),
    elevation: 0,
    maxElevation: ceiling,
  });
  const optical = finish.parameters.snapshot();
  const parameters = createParameters([
    0,
    0,
    0,
    0,
    0,
    extentY,
    ceiling,
    extentX,
    ...Array(MAX_NODES * 12).fill(0),
    ...optical,
  ]);
  function setGeometry(value: Solid) {
    const { nodes, bounds } = compileSolid(value);
    if (
      bounds.max[2] > ceiling ||
      bounds.min.slice(0, 2).some((v, i) => v < -[extentX, extentY][i] / 2) ||
      bounds.max.slice(0, 2).some((v, i) => v > [extentX, extentY][i] / 2)
    )
      throw Error('Solid exceeds fixed framing.');
    parameters.set(0, bounds.max[2]);
    parameters.set(1, bounds.min[2]);
    parameters.set(2, bounds.max[0] - bounds.min[0]);
    parameters.set(3, bounds.max[1] - bounds.min[1]);
    parameters.set(4, nodes.length / 12);
    for (let i = 0; i < MAX_NODES * 12; i++)
      parameters.set(8 + i, nodes[i] ?? 0);
  }
  setGeometry(solid);
  const material: Material = {
    bind: ceramicBinding(),
    shader,
    parameters,
    passes: ['shadow', 'surface'],
    measurePadding: (w, h) => {
      const scale = Math.min(w / extentX, h / extentY);
      return shadowBounds(w, h, ceiling * scale, optical.slice(12, 16));
    },
  };
  return { ...material, setGeometry };
}
