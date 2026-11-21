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
@fragment fn surface(in:VertexOut)->@location(0) vec4f {
 // One signed program, one parameter layout, one coverage rule. No crossfade
 // between two canvases/programs and no material-owned transition clock.
 var color:vec4f;
 if(material.shape.y<0){color=insetCeramic(in,material);}
 else {color=lightCeramic(material,ceramicGeometry(in),frame.viewportLight.zw);}
 let b=in.card.zw*0.5;
 let shadow=ceramicShadow(in.local-b,in.card.xy+b-frame.viewportLight.zw,material.shape.y,material.shadow);
 return over(color*ceramicRelief(material.shape.y),shadow);
}
`;
