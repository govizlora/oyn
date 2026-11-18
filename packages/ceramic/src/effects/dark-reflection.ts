export const darkReflectionWGSL = /* wgsl */ `
fn darkReflection(material:CeramicOptics,grad:vec2f,edge:f32,rimMask:f32,halfVec:vec3f,toLight:vec2f,normalFresnel:vec3f,normalSpec:vec3f)->vec4f {
  let viewDir=vec3f(0,0,1);
  let edgeCurve=pow(edge,1.15);let specCurve=pow(edge,2.25);
  let nh=max(dot(normalSpec,halfVec),0);let spec=pow(nh,mix(82.0,210.0,edgeCurve)*material.reflection.z);
  let fresnel=pow(1-max(dot(normalFresnel,viewDir),0),2.1);
  let lightLen=max(length(toLight),0.0001);let toLightDir=toLight/lightLen;
  let facing=pow(max(dot(grad,toLightDir),0),0.75);
  let attenuation=1/(1+lightLen*0.0035);
  let specAttenuation=1/(1+lightLen*0.009+lightLen*lightLen*0.00002);
  let borderBand=rimMask*(0.2+0.8*edgeCurve);
  let wrap=pow(abs(dot(grad,toLightDir)),0.6);let edgeFrostBand=rimMask*pow(edge,0.55);
  let frostedEdge=edgeFrostBand*(0.04+(0.08+0.2*wrap)*attenuation)*material.reflection.w;
  let response=spec*specAttenuation*(0.35+0.65*facing)*(0.15+0.85*specCurve)*4.2*material.reflection.y+fresnel*(0.15+0.85*facing)*1.6*material.gradient.w;
  let intensity=clamp(response*borderBand*attenuation*2.6+frostedEdge,0,1);
  return vec4f(vec3f(intensity),intensity);
}
`;
