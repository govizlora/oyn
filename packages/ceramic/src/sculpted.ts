import { ceramicResponseWGSL } from './effects/ceramic-response.js';
import { createCeramicMaterial } from './material.js';
import type { CeramicOptions } from './finish.js';
import { frameWGSL } from './effects/frame.js';
import { geometryWGSL } from './effects/geometry.js';
import { shadowWGSL } from './effects/shadow.js';

/** Experimental sibling material. The original Ceramic shader is untouched.
 * A planar solid minus spherical cutters describes the visible face. Boolean
 * intersections are hard min operations, not summed/blended deformations.
 * The original rounded silhouette owns the external cast shadow.
 */
export type SculptedOptions = Pick<
  CeramicOptions,
  'color' | 'elevation' | 'maxElevation'
> & {
  bevel?: number;
  hollow?: number;
  hollowRadius?: number;
  hollowX?: number;
  hollowY?: number;
  tilt?: number;
  doubleHollow?: boolean;
};
const shader = /* wgsl */ `
${frameWGSL}
struct Parameters { shape: vec4f, colorMode: vec4f, optics: vec4f, shadow: vec4f, reflection: vec4f, floating: vec4f, gradient: vec4f }
@group(0) @binding(1) var<uniform> material: Parameters;
${geometryWGSL}
${shadowWGSL}
${ceramicResponseWGSL}
// Lower hemisphere of a sphere whose intersection with z=0 has radius a.
// R=(a²+h²)/(2h) makes the cut exactly h deep. Outside the cutter,
// return the uncut plane; min implements subtraction from the top face.
fn sphereCut(p:vec2f,center:vec2f,a:f32,depth:f32)->f32 {
 if(depth<=0.0 || dot(p-center,p-center)>=a*a){return 0.0;}
 let h=min(depth,a);
 let radius=(a*a+h*h)/(2.0*h);
 return radius-h-sqrt(max(0.0,radius*radius-dot(p-center,p-center)));
}
fn cutHeight(p:vec2f,b:vec2f)->f32 {
 let center=vec2f(material.optics.z,material.optics.w)*b;
 let a=material.floating.w*min(b.x,b.y);
 var z=sphereCut(p,center,a,material.shape.w);
 if(material.colorMode.w>0.5){z=min(z,sphereCut(p,-center,a,material.shape.w));}
 return z;
}
fn heightAt(p:vec2f,b:vec2f,r:f32)->f32 {
 let d=roundedRect(p,b,r);
 let bevel=material.shape.z;
 let edge=clamp(1.0+d/bevel,0.0,1.0);
 let body=-bevel*(1.0-sqrt(max(0.0,1.0-edge*edge)));
 return min(body,cutHeight(p,b))+material.gradient.z*p.y/b.y;
}
// Only the cut face can be occluded by its surrounding flat lip.
fn cutVisibility(p:vec2f,b:vec2f,r:f32,l:vec3f)->f32 {
 if(cutHeight(p,b)>=-0.01){return 1.0;}
 let z=heightAt(p,b,r)+0.12;
 var visibility=1.0;
 for(var i=1;i<=12;i++) {
  let t=f32(i)*2.0;
  let q=p+l.xy*t;
  if(roundedRect(q,b,r)<0.0) {
   let clearance=z+l.z*t-heightAt(q,b,r);
   visibility=min(visibility,smoothstep(-0.3,0.8,clearance));
  }
 }
 return visibility;
}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
 let b=in.card.zw*0.5; let p=in.local-b;
 let r=min(frame.geometry.x,min(b.x,b.y));
 let d=roundedRect(p,b,r); let mask=surfaceMask(d);
 let e=0.12;
 let dx=(heightAt(p+vec2f(e,0),b,r)-heightAt(p-vec2f(e,0),b,r))/(2.0*e);
 let dy=(heightAt(p+vec2f(0,e),b,r)-heightAt(p-vec2f(0,e),b,r))/(2.0*e);
 let n=normalize(vec3f(-dx,-dy,1.0));
 let toLight=frame.viewportLight.zw-(in.card.xy+in.local);
 let l=normalize(vec3f(toLight,150.0));
 let visibility=cutVisibility(p,b,r,l);
 let cavity=-cutHeight(p,b)/max(material.shape.w,0.001);
 let color=ceramicResponse(material.colorMode.xyz,n,l,vec3f(0,0,1),visibility,cavity*0.025);
 return vec4f(clamp(color,vec3f(0),vec3f(1))*mask,mask);
}
`;
/** @deprecated Historical prototype. Use bakedCeramic with an offline profile.
 * Retained for compatibility; no Atelier route uses this lighting path. */
export function sculptedCeramic(options: SculptedOptions = {}) {
  const validateHeight = (value: number) => {
    if (!Number.isFinite(value) || value < 0)
      throw Error('Sculpted Ceramic requires a finite raised elevation.');
  };
  validateHeight(options.elevation ?? 10);
  const base = createCeramicMaterial({
    ...options,
    colorScheme: 'light',
    elevation: options.elevation ?? 10,
    lightRim: 4,
    shadowStrength: 0.18,
    contactShadowStrength: 0.07,
  });
  // Unused lanes in the original uniform layout hold face geometry. Shadow
  // parameters and the bounds calculation remain owned by Ceramic.
  function setGeometry(
    shape: Omit<SculptedOptions, 'color' | 'elevation' | 'maxElevation'>,
  ) {
    const values = [
      0,
      shape.hollow ?? 0,
      shape.hollowRadius ?? 0.78,
      shape.hollowX ?? 0,
      shape.hollowY ?? 0,
      shape.tilt ?? 0,
      shape.bevel ?? 0.8,
    ];
    if (
      !values.every(
        (v) => Number.isFinite(v) && Number.isFinite(Math.fround(v)),
      ) ||
      values[0] < 0 ||
      values[1] < 0 ||
      values[2] <= 0 ||
      values[6] <= 0
    )
      throw Error('Invalid sculpted Ceramic geometry.');
    const p = base.parameters;
    p.set(0, values[0]);
    p.set(3, values[1]);
    p.set(7, Number(!!shape.doubleHollow));
    p.set(10, values[3]);
    p.set(11, values[4]);
    p.set(23, values[2]);
    p.set(26, values[5]);
    p.set(2, values[6]);
  }
  setGeometry(options);
  return {
    ...base,
    shader,
    setGeometry,
    setElevation(value: number) {
      validateHeight(value);
      base.setElevation(value);
    },
  };
}
