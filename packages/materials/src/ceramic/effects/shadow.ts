import { SHADOW, reliefWGSL } from "../optics.js";
export const gaussianCoverageWGSL = /* wgsl */ `
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
  let sigma=max(blur,${SHADOW.minSigma});
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

`;
/** Four uniform height samples; contact attenuates remaining local light. */
export const ceramicShadowWGSL = /* wgsl */ `
${reliefWGSL}
fn ceramicShadow(p:vec2f,delta:vec2f,height:f32,settings:vec4f)->vec4f {
  if(height<=0 || (settings.z==0 && settings.w==0)){return vec4f(0);}
  let shadowDelta=delta*settings.x/length(vec3f(delta,settings.x));
  var blocked=0.0;
  for(var i=0;i<4;i++){
    let h=height*(1.0f/12.0f+(f32(i)+0.5f)/4.0f);let ratio=h/(settings.x-h);let scale=1+ratio;
    let projected=p-shadowDelta*ratio;
    blocked+=geometryShadowCoverage(projected,scale,settings.y*ratio*0.5,h)/4.0f;
  }
  let d=geometryShadowDistance(p);
  // Physical AO reach shrinks with the gap; no fixed-width contact halo.
  let ao=exp(-max(d,0)/max(0.0001,height*${SHADOW.aoFalloff}))*settings.w;
  // Contact darkening attenuates the light remaining at this pixel, not the
  // global shadow-strength setting. Unshadowed edges retain their contact cue.
  let projectedOpacity=blocked*settings.z;
  return vec4f(0,0,0,(projectedOpacity+ao*(1-projectedOpacity))*ceramicRelief(height));
}
`;
export const shadowWGSL = /* wgsl */ `
${gaussianCoverageWGSL}
fn geometryShadowCoverage(p:vec2f,scale:f32,blur:f32,height:f32)->f32 {
 let b=frame.rect.zw*0.5;let r=min(frame.geometry.x,min(b.x,b.y));
 return roundedCoverage(p,b*scale,r*scale,blur);
}
fn geometryShadowDistance(p:vec2f)->f32 {
 let b=frame.rect.zw*0.5;let r=min(frame.geometry.x,min(b.x,b.y));
 return roundedRect(p,b,r);
}
${ceramicShadowWGSL}
`;
