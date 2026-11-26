// One tangent profile: a small circular lip turns the top plane into the
// concave wall; the wall then eases back to the horizontal floor.
const wallAngle = (50 * Math.PI) / 180;
const curve = 2;
const lipRadius = 1.25;
let slope = 0;
for (let i = 0; i < 256; i++)
  slope += Math.tan(wallAngle * ((i + 0.5) / 256) ** curve) / 256;
export const insetWallSlope = slope;

export const insetSurfaceWGSL = /* wgsl */ `
fn insetProfileAngle(distance:f32,depth:f32)->f32 {
  // Reserve at least half the depth for the concave wall. The circular arc
  // obeys x=R*sin(angle), z=R*(1-cos(angle)); both joins share a tangent.
  let radius=min(${lipRadius},depth*0.5f/${1 - Math.cos(wallAngle)});
  let lipWidth=radius*${Math.sin(wallAngle)};
  let lipDepth=radius*${1 - Math.cos(wallAngle)};
  let wallWidth=(depth-lipDepth)/${insetWallSlope};
  if(distance<lipWidth){
    return asin(clamp(distance/max(radius,0.0001f),0.0f,${Math.sin(wallAngle)}));
  }
  let edge=1-clamp((distance-lipWidth)/max(wallWidth,0.0001f),0.0f,1.0f);
  return ${wallAngle}*pow(edge,${curve}.0f);
}
fn insetCeramic(in:VertexOut,material:CeramicOptics)->vec4f {
  let depth=-material.shape.y;
  let halfSize=in.card.zw*0.5;
  let p=in.local-halfSize;
  let radius=min(frame.geometry.x,min(halfSize.x,halfSize.y));
  let d=roundedRect(p,halfSize,radius);
  let mask=surfaceMask(d);
  let facing=-gradient(p,halfSize,radius);
  let toLight=frame.viewportLight.zw-(in.card.xy+in.local);
  let light=normalize(vec3f(toLight,material.reflection.x));
  let halfVec=normalize(light+vec3f(0,0,1));
  let direction=dot(facing,light.xy);
  let diffuse=pow(max(direction,0),2.14f);
  let backlit=smoothstep(0.0f,0.8f,-direction);
  let glossy=material.optics.x;
  let sharpness=mix(1.0f,material.reflection.z,glossy);
  let strength=mix(1.0f,material.reflection.y,glossy);
  // Integrate radiance, not normals: a subpixel lip must not flicker as its
  // narrow reflection crosses pixel centers. No extra outline or surface pass.
  let footprint=max(fwidth(d),0.0001f);
  var lighting=vec4f(0);
  for(var i=0;i<4;i++){
    let distance=-d+((f32(i)+0.5f)/4.0f-0.5f)*footprint;
    let angle=insetProfileAngle(distance,depth);
    let normal=vec3f(facing*sin(angle),cos(angle));
    let band=sin(angle);
    let specular=pow(max(dot(normal,halfVec),0),80.8f*sharpness);
    let highlight=clamp((0.15f*diffuse+specular)*band*1.2f*strength,0,1);
    let shade=band*(0.05f+0.2f*backlit);
    lighting+=vec4f(vec3f(highlight),highlight+shade*(1-highlight))*0.25f;
  }
  let relief=ceramicRelief(depth);
  let contrast=min(depth*mix(0.006f,0.012f,material.shape.w),0.12f)*relief;
  let floorColor=mix(material.colorMode.xyz,vec3f(material.shape.w),contrast);
  return over(lighting*mask*relief,vec4f(floorColor,1)*material.colorMode.w*mask);
}
`;
