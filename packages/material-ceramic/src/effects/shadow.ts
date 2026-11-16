import { SHADOW } from '../optics.js';
export const shadowWGSL = /* wgsl */ `
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
  let ao=exp(-max(d,0)/max(${SHADOW.minAoFalloff},height*${SHADOW.aoFalloff}))*material.shadow.w*min(height,1);
  return vec4f(0,0,0,blocked*material.shadow.z+ao*(1-material.shadow.z));
}
`;
