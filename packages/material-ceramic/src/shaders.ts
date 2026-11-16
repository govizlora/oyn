import { geometryWGSL } from './effects/geometry.js';
import { shadowWGSL } from './effects/shadow.js';
import { darkReflectionWGSL } from './effects/dark-reflection.js';
// Ceramic WGSL; all production optics are owned by this material.
export const ceramicWGSL = /* wgsl */ `
struct Frame { viewportLight: vec4f, rect: vec4f, geometry: vec4f }
struct Parameters { shape: vec4f, colorMode: vec4f, optics: vec4f, shadow: vec4f, reflection: vec4f, floating: vec4f, gradient: vec4f }
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<uniform> material: Parameters;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) card: vec4f,
}
@vertex fn vertex(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> VertexOut {
  let corners = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let r=frame.rect; let pad=r.xy;
  let local=corners[v]*(r.zw+2*pad)-pad;
  let origin=r.xy;
  let pixel=origin+local;
  var out: VertexOut;
  out.position=vec4f(pixel/frame.viewportLight.xy*vec2f(2,-2)+vec2f(-1,1),0,1);
  out.local=local; out.card=r; return out;
}
${geometryWGSL}
${shadowWGSL}
${darkReflectionWGSL}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  let halfSize=in.card.zw*0.5;let p=in.local-halfSize;
  let radius=min(frame.geometry.x,min(halfSize.x,halfSize.y));
  let d=roundedRect(p,halfSize,radius);let mask=surfaceMask(d);
  let delta=in.card.xy+halfSize-frame.viewportLight.zw;
  var result=vec4f(material.colorMode.xyz*mask,mask);
  if(material.optics.y>0.5){
  let direction=delta/length(vec3f(delta,material.reflection.x));let extent=dot(halfSize,abs(direction));
  let side=dot(p,direction)/max(extent,0.001)*length(direction);
  let illumination=material.gradient.x*max(-side,0);let shade=material.gradient.y*max(side,0);
  result=over(vec4f(vec3f(illumination*(1-shade)),illumination+shade-illumination*shade)*mask,result);
  }
  let rim=max(1,material.shape.z);
  let inner=roundedRect(p,halfSize-vec2f(rim),max(0,radius-rim));
  let rimMask=mask*(1-surfaceMask(inner));
  let toLight=frame.viewportLight.zw-(in.card.xy+in.local);
  let lightDir=normalize(vec3f(toLight,material.reflection.x));let halfVec=normalize(lightDir+vec3f(0,0,1));
  let grad=gradient(p,halfSize,radius);let edge=1-clamp(-d,0,rim)/rim;
  if(material.optics.x>0.5){return over(darkReflection(grad,edge,rimMask,halfVec,toLight),result);}
  let angle=smoothstep(0,1,edge*edge)*1.48;
  let normal=vec3f(grad*sin(angle),cos(angle));let facingDirection=dot(grad,lightDir.xy);
  // Explicit f32 arguments avoid Naga's all-abstract mix constant-evaluation gap.
  let facing=pow(max(facingDirection,0),mix(1.5f,0.45f,material.floating.y));let band=rimMask*angle/1.48;
  let specular=pow(max(dot(normal,halfVec),0),mix(90.0f,12.0f,material.floating.y));
  let highlight=clamp((0.25*facing+specular)*band*material.floating.x,0,1);
  let rimShade=band*material.floating.z*smoothstep(0,0.8,-facingDirection);
  return over(vec4f(vec3f(highlight),highlight+rimShade*(1-highlight)),result);
}
`;
