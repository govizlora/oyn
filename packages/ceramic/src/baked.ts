import { ceramicDomBinding } from './interaction.js';
import { ceramicSurfaceWGSL } from './effects/ceramic-surface.js';
import { createParameters, type Appearance, type Material, type StaticData } from '@oyn/surface';
import { ceramicFinish, type CeramicOptions } from './finish.js';
import { geometryWGSL } from './effects/geometry.js';
import { frameWGSL } from './effects/frame.js';
import { ceramicLightingWGSL } from './effects/ceramic-lighting.js';
import { gaussianCoverageWGSL, ceramicShadowWGSL } from './effects/shadow.js';
import { shadowBounds } from './bounds.js';

/** Versioned, immutable orthographic geometry. Creation only decodes baked data. */
export type BakedGeometry = Readonly<{ data: StaticData; resolution: number; extent: number; height: number; shadowResolution: number; shadowExtent: number; width: number; depth: number; radius: number; analyticOutline: boolean }>;
export function decodeGeometry(buffer: ArrayBuffer): BakedGeometry {
  if(buffer.byteLength<32 || buffer.byteLength%4) throw Error('Invalid baked geometry.');
  const header=new Float32Array(buffer,0,8);
  const [version,n,a,b,c,d,levels]=header;
  if(!Number.isInteger(n)||n<2||n>1024)throw Error('Invalid baked resolution.');
  let description: Omit<BakedGeometry,'data'>;
  if(version===3) {
    if(![a,b,c].every(Number.isFinite)||a<=0||b<=0||c<0||c>Math.min(a,b)/2||buffer.byteLength!==32+n*n*8)throw Error('Invalid baked control.');
    description={resolution:n,extent:a,height:0,shadowResolution:0,shadowExtent:0,width:a,depth:b,radius:c,analyticOutline:true};
  } else {
    if(version!==2 || levels!==7 || !Number.isInteger(c)||c<2||c>1024 || ![a,b,d].every(v=>Number.isFinite(v)&&v>0) || buffer.byteLength!==32+n*n*8+c*c*6*7 || (c*c*6*7)%4) throw Error('Unsupported baked geometry.');
    description={resolution:n,extent:a,height:b,shadowResolution:c,shadowExtent:d,width:a,depth:a,radius:0,analyticOutline:false};
  }
  // Own a copy: caller mutations cannot alter the immutable resource.
  return Object.freeze({...description,data:Object.freeze({bytes:new Uint8Array(buffer.slice(32))})});
}
const shader=/* wgsl */ `
${frameWGSL}
${geometryWGSL}
${ceramicLightingWGSL}
${gaussianCoverageWGSL}
struct Parameters { field:vec4f, slices:vec4f, pose:vec4f, outline:vec4f, ceramic:CeramicOptics }
@group(0) @binding(1) var<uniform> m:Parameters;
@group(0) @binding(2) var<storage,read> data:array<u32>;
fn sceneScale()->f32 {return min(frame.rect.z/m.pose.z,frame.rect.w/m.pose.w);}
fn texel(p:vec2i)->vec3f {
 let n=i32(m.field.x);let q=clamp(p,vec2i(0),vec2i(n-1));let i=u32(q.y*n+q.x)*2u;
 return vec3f(unpack2x16snorm(data[i]),bitcast<f32>(data[i+1u]));
}
fn field(p:vec2f)->vec3f {
 let q=(p/m.pose.zw+0.5)*m.field.x-0.5;let lo=vec2i(floor(q));let f=fract(q);
 return mix(mix(texel(lo),texel(lo+vec2i(1,0)),f.x),mix(texel(lo+vec2i(0,1)),texel(lo+vec2i(1,1)),f.x),f.y);
}
fn shadowTexel(p:vec2i,slice:u32,level:u32)->f32 {
 let n=i32(m.slices.x);if(any(p<vec2i(0))||any(p>=vec2i(n))){return 0.0;}
 let i=(slice*7u+level)*u32(n*n)+u32(p.y*n+p.x);
 let packed=data[u32(m.field.x*m.field.x)*2u+i/4u];
 return f32((packed>>((i%4u)*8u))&255u)/255.0;
}
fn shadowLevel(p:vec2f,slice:u32,level:u32)->f32 {
 let q=(p/m.slices.y+0.5)*m.slices.x-0.5;let lo=vec2i(floor(q));let f=fract(q);
 return mix(mix(shadowTexel(lo,slice,level),shadowTexel(lo+vec2i(1,0),slice,level),f.x),mix(shadowTexel(lo+vec2i(0,1),slice,level),shadowTexel(lo+vec2i(1,1),slice,level),f.x),f.y);
}
fn geometryShadowCoverage(p:vec2f,projection:f32,blur:f32,height:f32)->f32 {
 let scale=sceneScale();
 if(m.outline.y>0.5){return roundedCoverage(p,m.pose.zw*0.5*scale*projection,m.outline.x*scale*projection,blur);}
 let sigma=blur/(projection*scale);
 let sigmas=array<f32,7>(0.0f,1.0f,2.0f,4.0f,8.0f,16.0f,32.0f);
 var lo=0u;for(var i=1u;i<6u;i++){if(sigma>=sigmas[i]){lo=i;}}
 let t=clamp((sigma-sigmas[lo])/(sigmas[lo+1u]-sigmas[lo]),0.0,1.0);
 let slice=u32(clamp(round(height/(m.field.z*scale)*6.0)-1.0,0.0,5.0));
 let q=p/(projection*scale);
 return mix(shadowLevel(q,slice,lo),shadowLevel(q,slice,lo+1u),t);
}
fn geometryShadowDistance(p:vec2f)->f32 {
 let scale=sceneScale();let q=p/scale;
 if(m.outline.y>0.5){return roundedRect(p,m.pose.zw*0.5*scale,m.outline.x*scale);}
 return (field(q).z+length(max(abs(q)-vec2f(m.field.y*0.5),vec2f(0))))*scale;
}
${ceramicShadowWGSL}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f {
 let b=in.card.zw*0.5;
 return ceramicShadow(in.local-b,in.card.xy+b-frame.viewportLight.zw,m.pose.x*sceneScale(),m.ceramic.shadow);
}
fn ceramicGeometry(in:VertexOut)->CeramicGeometry {
 let scale=sceneScale();let xy=(in.local-in.card.zw*0.5)/scale;
 let c=cos(m.pose.y);let s=sin(m.pose.y);
 let local=vec2f(c*xy.x+s*xy.y,-s*xy.x+c*xy.y);
 if(any(abs(local)>m.pose.zw*0.5)){discard;}
 let sample=field(local);
 var distance=sample.z*scale;
 if(m.outline.y>0.5){distance=roundedRect(xy*scale,m.pose.zw*0.5*scale,m.outline.x*scale);}
 let coverage=1.0-smoothstep(-0.6,0.6,distance);
 if(coverage<=0.0){discard;}
 let normalXY=vec2f(c*sample.x-s*sample.y,s*sample.x+c*sample.y);
 let n=normalize(vec3f(normalXY,sqrt(max(0.0001,1.0-dot(sample.xy,sample.xy)))));
 var grad=vec2f(0,-1);if(length(n.xy)>0.0001){grad=normalize(n.xy);}
 let band=clamp(acos(clamp(n.z,0.0,1.0))/1.48,0.0,1.0);
 let center=in.card.xy+in.card.zw*0.5;
 let g=CeramicGeometry(n,grad,band,coverage,select(0.0,coverage,band>0.0001),band,xy*scale,m.pose.zw*scale*0.5,center,in.card.xy+in.local,1.0,n,n);
 return g;
}
fn ceramicOptics()->CeramicOptics {return m.ceramic;}
${ceramicSurfaceWGSL}
`;
export type BakedOptions = Omit<CeramicOptions,'elevation'|'maxElevation'> & {
  /** Rigid placement of a baked rounded control, not a geometry rebuild. */
  elevation?: number;
  maxElevation?: number;
  rotation?: number;
};
export type BakedMaterial = Material & { setElevation(value:number):void; setRotation(value:number):void };
/** No recipe, compiler, ray marcher or per-shape shader in the runtime API. */
export function bakedCeramic(geometry:BakedGeometry, options:BakedOptions={}):BakedMaterial {
  let elevation=options.elevation??geometry.height,rotation=options.rotation??0;
  const maxElevation=options.maxElevation??elevation;
  const {values,validateSignedElevation}=ceramicFinish({...options,elevation,maxElevation});
  function validateHeight(value:number) {
    validateSignedElevation(value);
    if(value<0||value>maxElevation||(!geometry.analyticOutline&&value!==geometry.height))throw Error('Invalid baked elevation. Only rounded controls support live elevation.');
  }
  function validateRotation(value:number) {
    if(!Number.isFinite(value)||!Number.isFinite(Math.fround(value))||(value!==0&&(!geometry.analyticOutline||geometry.width!==geometry.depth||geometry.radius!==geometry.width/2)))throw Error('Rotation requires a circular baked control.');
  }
  validateHeight(elevation);validateRotation(rotation);
  const parameters=createParameters([geometry.resolution,geometry.extent,geometry.height,0,geometry.shadowResolution,geometry.shadowExtent,0,0,elevation,rotation,geometry.width,geometry.depth,geometry.radius,Number(geometry.analyticOutline),0,0,...values]);
  const shadow=new Float32Array(values.slice(12,16));
  const maxSigma=shadow[1]*geometry.height/(2*shadow[0]);
  if(!geometry.analyticOutline&&maxSigma>Math.min(32,(geometry.shadowExtent-geometry.extent)/8)) throw Error('Ceramic light exceeds the baked shadow blur budget. Re-bake with a larger shadow field.');
  const variants=new Map<string,BakedMaterial>();
  return {
    bind:ceramicDomBinding,shader,parameters,data:geometry.data,passes:['shadow','surface'],
    resolveMode: options.mode===undefined?mode=>{let variant=variants.get(mode);if(!variant){variant=bakedCeramic(geometry,{...options,mode,elevation,rotation});variants.set(mode,variant);}return variant;}:undefined,
    bounds:{initial:0,measure:(w,h)=>{
      const height=maxElevation*Math.min(w/geometry.width,h/geometry.depth);
      if(height>=shadow[0])throw Error('Baked geometry exceeds Ceramic light height.');
      return shadowBounds(w,h,height,shadow);
    }},
    setElevation(value:number){validateHeight(value);elevation=value;parameters.set(8,value);variants.forEach(v=>v.setElevation(value));},
    setRotation(value:number){validateRotation(value);rotation=value;parameters.set(9,value);variants.forEach(v=>v.setRotation(value));},
  };
}

export type BakedProps = BakedOptions & { geometry: BakedGeometry };
/** Declarative baked appearance. Pose updates preserve parameters and static GPU data. */
export const baked: Appearance<BakedProps> = {
  create(props, context) {
    let geometry=props.geometry;
    const config=(props:Readonly<BakedProps>,mode:'light'|'dark')=>{
      const {geometry:_,elevation:__,rotation:___,...finish}=props;
      return JSON.stringify({...finish,mode:props.mode??mode});
    };
    let key=config(props,context.mode);
    let source=bakedCeramic(geometry,{...props,mode:props.mode??context.mode});
    const parameters=source.parameters;
    const material:Material={bind:ceramicDomBinding,parameters,
      get shader(){return source.shader;},get passes(){return source.passes;},
      get bounds(){return source.bounds;},get data(){return source.data;}};
    return {material,update(next,context){
      const nextKey=config(next,context.mode);
      if(next.geometry!==geometry||nextKey!==key){
        const replacement=bakedCeramic(next.geometry,{...next,mode:next.mode??context.mode});
        replacement.parameters.snapshot().forEach((v,i)=>parameters.set(i,v));
        source=replacement;geometry=next.geometry;key=nextKey;
        return 'layout';
      }
      const elevation=next.elevation??geometry.height,rotation=next.rotation??0;
      if(source.parameters.get(8)===elevation&&source.parameters.get(9)===rotation)return;
      source.setElevation(elevation);source.setRotation(rotation);
      parameters.set(8,source.parameters.get(8));parameters.set(9,source.parameters.get(9));
      return 'draw';
    }};
  },
};
