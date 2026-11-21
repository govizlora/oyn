// Concave floor + wall optics. Geometry changes with depth; there is no separate
// program, parameter layout, palette or animation state for negative elevation.
const wallAngle = (50 * Math.PI) / 180;
const curve = 2;
let slope = 0;
for (let i = 0; i < 256; i++)
  slope += Math.tan(wallAngle * ((i + 0.5) / 256) ** curve) / 256;
export const insetWallSlope = slope;

export const insetSurfaceWGSL = /* wgsl */ `
fn insetCeramic(in:VertexOut,material:CeramicOptics)->vec4f {
  let depth=-material.shape.y;
  let halfSize=in.card.zw*0.5;
  let p=in.local-halfSize;
  let radius=min(frame.geometry.x,min(halfSize.x,halfSize.y));
  let d=roundedRect(p,halfSize,radius);
  let mask=surfaceMask(d);
  let rim=depth/${insetWallSlope};
  let rimMask=max(0,mask-surfaceMask(d+rim));
  let edge=1-clamp(-d,0,rim)/max(rim,0.0001);
  let angle=${wallAngle}*pow(edge,${curve}.0f);
  let facing=-gradient(p,halfSize,radius);
  let light=normalize(vec3f(frame.viewportLight.zw-(in.card.xy+in.local),material.reflection.x));
  let halfVec=normalize(light+vec3f(0,0,1));
  let normal=vec3f(facing*sin(angle),cos(angle));
  let direction=dot(facing,light.xy);
  let band=rimMask*sin(angle);
  let diffuse=pow(max(direction,0),2.14f);
  let specular=pow(max(dot(normal,halfVec),0),80.8f);
  let highlight=clamp((0.15f*diffuse+specular)*band*1.2f,0,1);
  let backlit=smoothstep(0.0f,0.8f,-direction);
  let shade=band*(0.05f+0.2f*backlit);
  let contrast=min(depth*mix(0.006f,0.012f,material.shape.w),0.12f);
  let floorColor=mix(material.colorMode.xyz,vec3f(material.shape.w),contrast);
  return over(vec4f(vec3f(highlight),highlight+shade*(1-highlight)),vec4f(floorColor*mask,mask));
}
`;
