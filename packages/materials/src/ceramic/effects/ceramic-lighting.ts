import { darkReflectionWGSL } from './dark-reflection.js';
/** The original Ceramic optical equations, with explicit geometry inputs.
 * Geometry supplies the calibrated shading normal and rim coverage; lighting
 * does not infer a shape or substitute a physical fillet for the authored rim.
 */
export const ceramicLightingWGSL = /* wgsl */ `
struct CeramicOptics { shape: vec4f, colorMode: vec4f, optics: vec4f, shadow: vec4f, reflection: vec4f, floating: vec4f, gradient: vec4f }
struct CeramicGeometry {
 normal:vec3f, outlineNormal:vec2f, edge:f32, coverage:f32,
 rimCoverage:f32, band:f32, local:vec2f, extent:vec2f,
 center:vec2f, position:vec2f, visibility:f32, fresnelNormal:vec3f, reflectionNormal:vec3f
}
${darkReflectionWGSL}
fn ceramicOcclusion(color:vec4f,g:CeramicGeometry,material:CeramicOptics)->vec4f {
 return vec4f(color.rgb*(1.0-(1.0-g.visibility)*material.shadow.z),color.a);
}
fn lightCeramic(material:CeramicOptics,g:CeramicGeometry,light:vec2f,relief:f32)->vec4f {
  let halfSize=g.extent;let p=g.local;let mask=g.coverage;
  let delta=g.center-light;
  var result=vec4f(material.colorMode.xyz,1)*material.colorMode.w*mask;
  if(material.optics.y>0.5){
  let direction=delta/length(vec3f(delta,material.reflection.x));let extent=dot(halfSize,abs(direction));
  let side=dot(p,direction)/max(extent,0.001)*length(direction);
  let illumination=material.gradient.x*max(-side,0);let shade=material.gradient.y*max(side,0);
  result=over(vec4f(vec3f(illumination*(1-shade)),illumination+shade-illumination*shade)*(relief*result.a),result);
  }
  let toLight=light-g.position;
  let lightDir=normalize(vec3f(toLight,material.reflection.x));let halfVec=normalize(lightDir+vec3f(0,0,1));
  let grad=g.outlineNormal;let edge=g.edge;let rimMask=g.rimCoverage*relief;
  if(material.optics.x>0.5){return ceramicOcclusion(over(darkReflection(material,grad,edge,rimMask,halfVec,toLight,g.fresnelNormal,g.reflectionNormal),result),g,material);}
  let normal=g.normal;let facingDirection=dot(grad,lightDir.xy);
  // Explicit f32 arguments avoid Naga's all-abstract mix constant-evaluation gap.
  let facing=pow(max(facingDirection,0),mix(1.5f,0.45f,material.floating.y));let band=g.band;
  let specular=pow(max(dot(normal,halfVec),0),mix(90.0f,12.0f,material.floating.y));
  let highlight=clamp((0.25*facing+specular)*band*material.floating.x,0,1);
  let rimShade=band*material.floating.z*smoothstep(0,0.8,-facingDirection);
  return ceramicOcclusion(over(vec4f(vec3f(highlight),highlight+rimShade*(1-highlight))*relief,result),g,material);
}
`;
