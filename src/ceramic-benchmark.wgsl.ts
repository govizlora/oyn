// Light/dark Ceramic benchmark port. Both presentation modes use this one module.
// Optical equations match material-ceramic; production GLSL is unchanged.
export const ceramicWGSL = /* wgsl */ `
struct Frame { viewportLight: vec4f, shape: vec4f, colorMode: vec4f, optics: vec4f }
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> cards: array<vec4f>;
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) @interpolate(flat) card: vec4f,
}
@vertex fn vertex(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> VertexOut {
  let corners = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let r=cards[i]; let pad=frame.shape.w;
  let local=corners[v]*(r.zw+2*pad)-pad;
  let origin=select(r.xy,vec2f(pad),frame.colorMode.w>0.5);
  let pixel=origin+local;
  var out: VertexOut;
  out.position=vec4f(pixel/frame.viewportLight.xy*vec2f(2,-2)+vec2f(-1,1),0,1);
  out.local=local; out.card=r; return out;
}
fn roundedRect(p:vec2f, halfSize:vec2f, radius:f32)->f32 {
  let q=abs(p)-halfSize+radius;
  return length(max(q,vec2f(0)))+min(max(q.x,q.y),0)-radius;
}
fn surfaceMask(d:f32)->f32 { let aa=max(fwidth(d),0.4); return 1-smoothstep(-aa,aa,d); }
fn gradient(p:vec2f, halfSize:vec2f, radius:f32)->vec2f {
  let g=vec2f(roundedRect(p+vec2f(1,0),halfSize,radius)-roundedRect(p-vec2f(1,0),halfSize,radius),
    roundedRect(p+vec2f(0,1),halfSize,radius)-roundedRect(p-vec2f(0,1),halfSize,radius));
  if(length(g)>0){return normalize(g);}return vec2f(0,-1);
}
fn over(front:vec4f,back:vec4f)->vec4f {return front+back*(1-front.a);}
fn coverage(d:f32,sigma:f32)->f32 {return 0.5-0.5*(2/(1+exp(clamp(-d*1.7/max(sigma,0.35),-40.0,40.0)))-1);}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f {
  let halfSize=in.card.zw*0.5; let p=in.local-halfSize;
  let radius=min(frame.shape.x,min(halfSize.x,halfSize.y));let height=frame.shape.y;
  let delta=in.card.xy+halfSize-frame.viewportLight.zw;
  let shadowDelta=delta*480/length(vec3f(delta,480));
  var blocked=0.0;
  for(var i=1;i<=6;i++){
    let h=height*f32(i)/6;let ratio=h/(480-h);let scale=1+ratio;
    let projected=(p-shadowDelta*ratio)/scale;
    let distance=roundedRect(projected,halfSize,radius)*scale;
    blocked+=coverage(distance,240*ratio*0.5)/6;
  }
  let d=roundedRect(p,halfSize,radius);
  let ao=exp(-max(d,0)/max(0.5,height*0.35))*0.02;
  return vec4f(0,0,0,blocked*0.12+ao*(1-0.12));
}
// Matches packages/material-ceramic/src/effects/dark-reflection.ts.
fn darkReflection(grad:vec2f,edge:f32,rimMask:f32,halfVec:vec3f,toLight:vec2f)->vec4f {
  let viewDir=vec3f(0,0,1);
  let edgeCurve=pow(edge,1.15);let specCurve=pow(edge,2.25);
  let tiltFresnel=0.94*edgeCurve;let tiltSpec=0.985*specCurve;
  let normalFresnel=normalize(vec3f(grad*tiltFresnel,sqrt(max(0.0001,1-tiltFresnel*tiltFresnel))));
  let normalSpec=normalize(vec3f(grad*tiltSpec,sqrt(max(0.0001,1-tiltSpec*tiltSpec))));
  let nh=max(dot(normalSpec,halfVec),0);let spec=pow(nh,mix(82.0,210.0,edgeCurve));
  let fresnel=pow(1-max(dot(normalFresnel,viewDir),0),2.1);
  let lightLen=max(length(toLight),0.0001);let toLightDir=toLight/lightLen;
  let facing=pow(max(dot(grad,toLightDir),0),0.75);
  let attenuation=1/(1+lightLen*0.0035);
  let specAttenuation=1/(1+lightLen*0.009+lightLen*lightLen*0.00002);
  let borderBand=rimMask*(0.2+0.8*edgeCurve);
  let wrap=pow(abs(dot(grad,toLightDir)),0.6);let edgeFrostBand=rimMask*pow(edge,0.55);
  let frostedEdge=edgeFrostBand*(0.04+(0.08+0.2*wrap)*attenuation)*0.1;
  let response=spec*specAttenuation*(0.35+0.65*facing)*(0.15+0.85*specCurve)*4.2+fresnel*(0.15+0.85*facing)*1.6;
  let intensity=clamp(response*borderBand*attenuation*2.6+frostedEdge,0,1);
  return vec4f(vec3f(intensity),intensity);
}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
  let halfSize=in.card.zw*0.5;let p=in.local-halfSize;
  let radius=min(frame.shape.x,min(halfSize.x,halfSize.y));
  let d=roundedRect(p,halfSize,radius);let mask=surfaceMask(d);
  let delta=in.card.xy+halfSize-frame.viewportLight.zw;
  var result=vec4f(frame.colorMode.xyz*mask,mask);
  if(frame.optics.y>0.5){
  let direction=delta/length(vec3f(delta,24));let extent=dot(halfSize,abs(direction));
  let side=dot(p,direction)/max(extent,0.001)*length(direction);
  let illumination=0.2*max(-side,0);let shade=0.01*max(side,0);
  result=over(vec4f(vec3f(illumination*(1-shade)),illumination+shade-illumination*shade)*mask,result);
  }
  let rim=max(1,frame.shape.z);
  let inner=roundedRect(p,halfSize-vec2f(rim),max(0,radius-rim));
  let rimMask=mask*(1-surfaceMask(inner));
  let toLight=frame.viewportLight.zw-(in.card.xy+in.local);
  let lightDir=normalize(vec3f(toLight,24));let halfVec=normalize(lightDir+vec3f(0,0,1));
  let grad=gradient(p,halfSize,radius);let edge=1-clamp(-d,0,rim)/rim;
  if(frame.optics.x>0.5){return over(darkReflection(grad,edge,rimMask,halfVec,toLight),result);}
  let angle=smoothstep(0,1,edge*edge)*1.48;
  let normal=vec3f(grad*sin(angle),cos(angle));let facingDirection=dot(grad,lightDir.xy);
  // Explicit f32 arguments avoid Naga's all-abstract mix constant-evaluation gap.
  let facing=pow(max(facingDirection,0),mix(1.5f,0.45f,0.8f));let band=rimMask*angle/1.48;
  let specular=pow(max(dot(normal,halfVec),0),mix(90.0f,12.0f,0.8f));
  let highlight=clamp((0.25*facing+specular)*band*2.4,0,1);
  let rimShade=band*0.025*smoothstep(0,0.8,-facingDirection);
  return over(vec4f(vec3f(highlight),highlight+rimShade*(1-highlight)),result);
}
`;
