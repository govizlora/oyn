import { ceramicBinding } from '../../packages/ceramic/src/interaction';
/** Research-only assemblies. Production optics, geometry and scheduling stay unchanged. */
import { createParameters, type Material } from '@oyn/surface';
import { ceramicFinish } from '../../packages/ceramic/src/finish';
import { frameWGSL } from '../../packages/ceramic/src/effects/frame';
import { geometryWGSL } from '../../packages/ceramic/src/effects/geometry';
import { ceramicLightingWGSL } from '../../packages/ceramic/src/effects/ceramic-lighting';
import { ceramicGeometryWGSL } from '../../packages/ceramic/src/effects/ceramic-geometry';
import { ceramicSurfaceWGSL } from '../../packages/ceramic/src/effects/ceramic-surface';
import { gaussianCoverageWGSL, ceramicShadowForLayers } from '../../packages/ceramic/src/effects/shadow';
// Uniform midpoint sampling centered on the production mean height 7H/12.
// n=6 reproduces iH/6; n=3 preserves the previously approved paired-average rule.
export const layerCounts=[6,5,4,3] as const;
export const heightRules=layerCounts.map(count=>({
 heights:Array.from({length:count},(_,i)=>1/12+(i+0.5)/count),
 weights:Array(count).fill(1/count) as number[],
}));
export type Settings = { elevation:number; radius:number; lightHeight:number; lightSize:number; strength:number; contact:number; surfaceLight:number; gloss:number; color:string; shadowsOnly:boolean };
export const initial:Settings = {elevation:16,radius:24,lightHeight:480,lightSize:240,strength:.09,contact:.015,surfaceLight:24,gloss:2.4,color:'#f0f0f0',shadowsOnly:false};
const shaders=layerCounts.map((count)=>`${frameWGSL}\n${geometryWGSL}\n${ceramicLightingWGSL}\n${ceramicGeometryWGSL}\n${gaussianCoverageWGSL}
struct LabParameters { optics:CeramicOptics }
@group(0) @binding(1) var<uniform> lab:LabParameters;

fn geometryShadowCoverage(p:vec2f,scale:f32,blur:f32,height:f32)->f32{let b=frame.rect.zw*0.5;return roundedCoverage(p,b*scale,min(frame.geometry.x,min(b.x,b.y))*scale,blur);}
fn geometryShadowDistance(p:vec2f)->f32{let b=frame.rect.zw*0.5;return roundedRect(p,b,min(frame.geometry.x,min(b.x,b.y)));}
${ceramicShadowForLayers(count)}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f{return ceramicShadow(in.local-in.card.zw*0.5,in.card.xy+in.card.zw*0.5-frame.viewportLight.zw,lab.optics.shape.y,lab.optics.shadow);}
fn ceramicOptics()->CeramicOptics{return lab.optics;}
fn ceramicGeometry(in:VertexOut)->CeramicGeometry{let b=in.card.zw*0.5;return roundedCeramicGeometry(in.local-b,b,min(frame.geometry.x,min(b.x,b.y)),max(1,lab.optics.shape.z),1.0f,in.card.xy+b);}
${ceramicSurfaceWGSL}`);
export function labMaterial(index:number,s:Settings):Material {
 const finish=ceramicFinish({colorScheme:'light',color:s.color,elevation:s.elevation,shadowLightHeight:s.lightHeight,shadowLightSize:s.lightSize,shadowStrength:s.strength,contactShadowStrength:s.contact,lightZ:s.surfaceLight,lightReflectionStrength:s.gloss});
 return {bind: ceramicBinding(),shader:shaders[index],parameters:createParameters(finish.values),passes:s.shadowsOnly?['shadow']:['shadow','surface'],measurePadding:()=>{
 // A bounded research viewport, not a bound on the global light position.
 // Extreme settings may project beyond the preview window.
 return {x:240,y:240};
 }};
}
