/** Calibrated optical normals for a Ceramic glaze, independent of its substrate. */
export const ceramicGlossyNormalsWGSL = /* wgsl */ `
fn ceramicGlossyNormals(grad:vec2f,edge:f32)->mat2x3f {
 let tiltFresnel=0.94*pow(edge,1.15);let tiltSpec=0.985*pow(edge,2.25);
 let normalFresnel=normalize(vec3f(grad*tiltFresnel,sqrt(max(0.0001,1-tiltFresnel*tiltFresnel))));
 let normalSpec=normalize(vec3f(grad*tiltSpec,sqrt(max(0.0001,1-tiltSpec*tiltSpec))));
 return mat2x3f(normalFresnel,normalSpec);
}
`;
/** Analytic rounded-card geometry adapter. No light or material-color logic. */
export const ceramicGeometryWGSL = /* wgsl */ `
${ceramicGlossyNormalsWGSL}
fn roundedCeramicGeometry(p:vec2f,b:vec2f,radius:f32,rim:f32,exposure:f32,center:vec2f)->CeramicGeometry {
 let d=roundedRect(p,b,radius);let mask=surfaceMask(d);
 let width=rim*exposure;
 let inner=roundedRect(p,b-vec2f(width),max(0,radius-width));
 // Subtract coverages: mask*(1-innerMask) leaves a halo even at zero rim width.
 let rimMask=max(0,mask-surfaceMask(inner));
 // Keep the calibrated glaze profile anchored in CSS space while the exposed
 // band shrinks. Rescaling its steep specular lobe through pixel centers makes
 // shallow rims flash.
 let grad=gradient(p,b,radius);let edge=1-clamp(-d,0,rim)/max(rim,0.0001);
 let angle=smoothstep(0,1,edge*edge)*1.48;
 let normal=vec3f(grad*sin(angle),cos(angle));
 let glossy=ceramicGlossyNormals(grad,edge);
 return CeramicGeometry(normal,grad,edge,mask,rimMask,rimMask*angle/1.48,p,b,center,center+p,1.0,glossy[0],glossy[1]);
}
`;
