/** Analytic rounded-card geometry adapter. No light or material-color logic. */
export const ceramicGeometryWGSL = /* wgsl */ `
fn roundedCeramicGeometry(p:vec2f,b:vec2f,radius:f32,rim:f32,center:vec2f)->CeramicGeometry {
 let d=roundedRect(p,b,radius);let mask=surfaceMask(d);
 let inner=roundedRect(p,b-vec2f(rim),max(0,radius-rim));
 let rimMask=mask*(1-surfaceMask(inner));
 let grad=gradient(p,b,radius);let edge=1-clamp(-d,0,rim)/rim;
 let angle=smoothstep(0,1,edge*edge)*1.48;
 let normal=vec3f(grad*sin(angle),cos(angle));
 let tiltFresnel=0.94*pow(edge,1.15);let tiltSpec=0.985*pow(edge,2.25);
 let normalFresnel=normalize(vec3f(grad*tiltFresnel,sqrt(max(0.0001,1-tiltFresnel*tiltFresnel))));
 let normalSpec=normalize(vec3f(grad*tiltSpec,sqrt(max(0.0001,1-tiltSpec*tiltSpec))));
 return CeramicGeometry(normal,grad,edge,mask,rimMask,rimMask*angle/1.48,p,b,center,center+p,1.0,normalFresnel,normalSpec);
}
`;
