export const geometryWGSL = /* wgsl */ `
fn roundedRect(p:vec2f, halfSize:vec2f, radius:f32)->f32 {
  let q=abs(p)-halfSize+radius;
  return length(max(q,vec2f(0)))+min(max(q.x,q.y),0)-radius;
}
fn surfaceMask(d:f32)->f32 { let aa=max(fwidth(d),0.4); return 1-smoothstep(-aa,aa,d); }
fn gradient(p:vec2f, halfSize:vec2f, radius:f32)->vec2f {
  let g=vec2f(roundedRect(p+vec2f(1,0),halfSize,radius)-roundedRect(p-vec2f(1,0),halfSize,radius),
    roundedRect(p+vec2f(0,1),halfSize,radius)-roundedRect(p-vec2f(0,1),halfSize,radius));
  if(length(g)>0){return normalize(g);}return vec2f(0,-1);
}
fn over(front:vec4f,back:vec4f)->vec4f {return front+back*(1-front.a);}
`;
