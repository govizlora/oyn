import { ceramicSurfaceWGSL } from './effects/ceramic-surface.js';
import { frameWGSL } from './effects/frame.js';
import { geometryWGSL } from './effects/geometry.js';
import { shadowWGSL } from './effects/shadow.js';
import { ceramicLightingWGSL } from './effects/ceramic-lighting.js';
import { ceramicGeometryWGSL } from './effects/ceramic-geometry.js';
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
 let g=roundedCeramicGeometry(p,halfSize,radius,max(1,material.shape.z),in.card.xy+halfSize);
 return g;
}
fn ceramicOptics()->CeramicOptics {return material;}
${ceramicSurfaceWGSL}
`;
