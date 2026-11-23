import { groundFrostWGSL } from "./optics.js";
import { insetSurfaceWGSL } from "./inset.js";
import { frameWGSL } from "./effects/frame.js";
import { geometryWGSL } from "./effects/geometry.js";
import { shadowWGSL } from "./effects/shadow.js";
import { ceramicLightingWGSL } from "./effects/ceramic-lighting.js";
import { ceramicGeometryWGSL } from "./effects/ceramic-geometry.js";
export const ceramicWGSL = /* wgsl */ `
${frameWGSL}
${geometryWGSL}
${ceramicLightingWGSL}
${ceramicGeometryWGSL}
alias Parameters = CeramicOptics;
@group(0) @binding(1) var<uniform> material: Parameters;
${shadowWGSL}
fn ceramicGeometry(in:VertexOut)->CeramicGeometry {
 let halfSize=in.card.zw*0.5;let p=in.local-halfSize;
 let radius=min(frame.geometry.x,min(halfSize.x,halfSize.y));
 let width=max(material.shape.z,0.0001);
 let exposure=smoothstep(0.0f,width,max(0,material.shape.y));
 let g=roundedCeramicGeometry(p,halfSize,radius,material.shape.z,exposure,in.card.xy+halfSize);
 return g;
}
${insetSurfaceWGSL}
${groundFrostWGSL}
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
 if(material.shape.y<0){return insetCeramic(in,material);}
 let g=ceramicGeometry(in);
 let face=lightCeramic(material,g,frame.viewportLight.zw,ceramicRelief(material.shape.y));
 let b=in.card.zw*0.5;
 let shadow=ceramicShadow(in.local-b,in.card.xy+b-frame.viewportLight.zw,material.shape.y,material.shadow);
 // Only the receiver outside the silhouette can see this surface's shadow,
 // even when the surface has no pigment of its own.
 let frost=groundFrost(in.local-b,geometryShadowDistance(in.local-b),material.shape.y,material.optics.x*material.reflection.w,material.optics.z);
 return face+over(vec4f(frost),shadow)*(1-max(g.coverage,face.a));
}
`;
