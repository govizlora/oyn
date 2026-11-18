import { ceramicSurfaceWGSL } from "../effects/ceramic-surface.js";
import { geometryWGSL } from "../effects/geometry.js";
import { frameWGSL } from "../effects/frame.js";
import { ceramicLightingWGSL } from "../effects/ceramic-lighting.js";
import { gaussianCoverageWGSL, ceramicShadowWGSL } from "../effects/shadow.js";

export const bakedWGSL = /* wgsl */ `
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
