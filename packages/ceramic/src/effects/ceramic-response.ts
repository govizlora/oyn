/** Geometry-independent, experimental light-scheme ceramic response.
 * Retained only for the earlier sculpted-control experiment. The solid renderer
 * now uses the original Ceramic equations in ceramic-lighting.ts.
 */
export const ceramicResponseWGSL = /* wgsl */ `
fn ceramicResponse(color:vec3f,n:vec3f,l:vec3f,view:vec3f,visibility:f32,occlusion:f32)->vec3f {
 let h=normalize(l+view);
 let diffuse=(dot(n,l)-l.z)*0.32;
 let spec=pow(max(dot(n,h),0.0),70.0)*0.08;
 return color*(1.0+diffuse-occlusion-(1.0-visibility)*0.14)+vec3f(spec);
}
`;
