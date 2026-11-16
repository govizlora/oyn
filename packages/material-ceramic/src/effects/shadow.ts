import { SHADOW } from '../optics.js';
export const shadowWGSL = /* wgsl */ `
fn coverage(d:f32,sigma:f32)->f32 {return 0.5-0.5*(2/(1+exp(clamp(-d*${SHADOW.coverageSlope}/max(sigma,${SHADOW.minSigma}),-40.0,40.0)))-1);}
@fragment fn shadow(in:VertexOut)->@location(0) vec4f {
  let halfSize=in.card.zw*0.5; let p=in.local-halfSize;
  let radius=min(frame.geometry.x,min(halfSize.x,halfSize.y));let height=material.shape.y;
  if(height <= 0){return vec4f(0);}
  let delta=in.card.xy+halfSize-frame.viewportLight.zw;
  let shadowDelta=delta*material.shadow.x/length(vec3f(delta,material.shadow.x));
  var blocked=0.0;
  for(var i=1;i<=6;i++){
    let h=height*f32(i)/6;let ratio=h/(material.shadow.x-h);let scale=1+ratio;
    let projected=(p-shadowDelta*ratio)/scale;
    let distance=roundedRect(projected,halfSize,radius)*scale;
    blocked+=coverage(distance,material.shadow.y*ratio*0.5)/6;
  }
  let d=roundedRect(p,halfSize,radius);
  let ao=exp(-max(d,0)/max(${SHADOW.minAoFalloff},height*${SHADOW.aoFalloff}))*material.shadow.w*min(height,1);
  return vec4f(0,0,0,blocked*material.shadow.z+ao*(1-material.shadow.z));
}
`;
