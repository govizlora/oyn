// Frozen pre-extraction reference. Test-only; do not regenerate to hide visual regressions.


struct Frame { viewportLight: vec4f, rect: vec4f, geometry: vec4f }
@group(0) @binding(0) var<uniform> frame: Frame;
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

struct Parameters { shape: vec4f, colorMode: vec4f, optics: vec4f, shadow: vec4f, reflection: vec4f, floating: vec4f, gradient: vec4f }
@group(0) @binding(1) var<uniform> material: Parameters;

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


// Gaussian convolution of the actual rounded silhouette, not a distance-field ramp.
// Integrate X analytically; the straight Y band is analytic too. Only circular
// corner bands need quadrature. This gives corners less coverage than flat edges.
fn normalCDF(x:f32)->f32 {
  let a=abs(x);let t=1/(1+0.2316419*a);
  let tail=0.39894228*exp(-0.5*a*a)*t*(0.31938153+t*(-0.35656378+t*(1.78147794+t*(-1.82125598+t*1.33027443))));
  return select(tail,1-tail,x>=0);
}
fn gaussianInterval(lo:f32,hi:f32,p:f32,sigma:f32)->f32 {
  return max(0,normalCDF((hi-p)/sigma)-normalCDF((lo-p)/sigma));
}
fn roundedCoverage(p:vec2f,b:vec2f,r:f32,blur:f32)->f32 {
  let sigma=max(blur,0.35);
  let xCoverage=gaussianInterval(-b.x,b.x,p.x,sigma);
  let rect=xCoverage*gaussianInterval(-b.y,b.y,p.y,sigma);
  // Outside the corner influence, the separable rectangle integral is sufficient.
  if(r<=0 || abs(p.x)<b.x-r-4*sigma || abs(p.y)<b.y-r-4*sigma){return rect;}
  var result=xCoverage*gaussianInterval(-b.y+r,b.y-r,p.y,sigma);
  let nodes=array<f32,8>(-0.96028986f,-0.79666648f,-0.52553241f,-0.18343464f,0.18343464f,0.52553241f,0.79666648f,0.96028986f);
  let weights=array<f32,8>(0.10122854f,0.22238103f,0.31370665f,0.36268378f,0.36268378f,0.31370665f,0.22238103f,0.10122854f);
  for(var side=0;side<2;side++){
    let bandLow=select(-b.y,b.y-r,side==1);
    let bandHigh=select(-b.y+r,b.y,side==1);
    let lo=max(bandLow,p.y-4*sigma);let hi=min(bandHigh,p.y+4*sigma);
    if(hi<=lo){continue;}
    let mid=(lo+hi)*0.5;let span=(hi-lo)*0.5;
    for(var j=0;j<8;j++){
      let y=mid+span*nodes[j];
      let dy=abs(y)-(b.y-r);
      let extent=b.x-r+sqrt(max(0,r*r-dy*dy));
      let v=(y-p.y)/sigma;
      result+=weights[j]*span*0.39894228/sigma*exp(-0.5*v*v)*gaussianInterval(-extent,extent,p.x,sigma);
    }
  }
  return clamp(result,0,1);
}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f {
  let halfSize=in.card.zw*0.5; let p=in.local-halfSize;
  let radius=min(frame.geometry.x,min(halfSize.x,halfSize.y));let height=material.shape.y;
  if(height <= 0){return vec4f(0);}
  let delta=in.card.xy+halfSize-frame.viewportLight.zw;
  let shadowDelta=delta*material.shadow.x/length(vec3f(delta,material.shadow.x));
  var blocked=0.0;
  for(var i=1;i<=6;i++){
    let h=height*f32(i)/6;let ratio=h/(material.shadow.x-h);let scale=1+ratio;
    let projected=p-shadowDelta*ratio;
    blocked+=roundedCoverage(projected,halfSize*scale,radius*scale,material.shadow.y*ratio*0.5)/6;
  }
  let d=roundedRect(p,halfSize,radius);
  let ao=exp(-max(d,0)/max(0.5,height*0.35))*material.shadow.w*min(height,1);
  return vec4f(0,0,0,blocked*material.shadow.z+ao*(1-material.shadow.z));
}


fn darkReflection(grad:vec2f,edge:f32,rimMask:f32,halfVec:vec3f,toLight:vec2f)->vec4f {
  let viewDir=vec3f(0,0,1);
  let edgeCurve=pow(edge,1.15);let specCurve=pow(edge,2.25);
  let tiltFresnel=0.94*edgeCurve;let tiltSpec=0.985*specCurve;
  let normalFresnel=normalize(vec3f(grad*tiltFresnel,sqrt(max(0.0001,1-tiltFresnel*tiltFresnel))));
  let normalSpec=normalize(vec3f(grad*tiltSpec,sqrt(max(0.0001,1-tiltSpec*tiltSpec))));
  let nh=max(dot(normalSpec,halfVec),0);let spec=pow(nh,mix(82.0,210.0,edgeCurve)*material.reflection.z);
  let fresnel=pow(1-max(dot(normalFresnel,viewDir),0),2.1);
  let lightLen=max(length(toLight),0.0001);let toLightDir=toLight/lightLen;
  let facing=pow(max(dot(grad,toLightDir),0),0.75);
  let attenuation=1/(1+lightLen*0.0035);
  let specAttenuation=1/(1+lightLen*0.009+lightLen*lightLen*0.00002);
  let borderBand=rimMask*(0.2+0.8*edgeCurve);
  let wrap=pow(abs(dot(grad,toLightDir)),0.6);let edgeFrostBand=rimMask*pow(edge,0.55);
  let frostedEdge=edgeFrostBand*(0.04+(0.08+0.2*wrap)*attenuation)*material.reflection.w;
  let response=spec*specAttenuation*(0.35+0.65*facing)*(0.15+0.85*specCurve)*4.2+fresnel*(0.15+0.85*facing)*1.6;
  let intensity=clamp(response*borderBand*attenuation*2.6*material.reflection.y+frostedEdge,0,1);
  return vec4f(vec3f(intensity),intensity);
}

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
